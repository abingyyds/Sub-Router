export function hasVideoPricingDetails(item) {
  const details = item?.pricing_details;
  return details?.type === 'video' && Array.isArray(details.items) && details.items.length > 0;
}

const TOKEN_PRICING_VARS = [
  { key: 'p', label: 'pricing.inputPriceShort' },
  { key: 'c', label: 'pricing.outputPriceShort' },
  { key: 'cr', label: 'pricing.cacheReadShort' },
  { key: 'cc', label: 'pricing.cacheCreationShort' },
  { key: 'cc1h', label: 'pricing.cacheCreation1h' },
  { key: 'img', label: '图片输入' },
  { key: 'img_o', label: '图片输出' },
  { key: 'ai', label: '音频输入' },
  { key: 'ao', label: '音频输出' },
];

const NUMBER_LITERAL = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?';

const stripExprVersion = (value) =>
  String(value || '').replace(/^v\d+\s*:/, '').trim();

const findMatchingParen = (text, openIndex) => {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
};

const readQuotedString = (text, start) => {
  if (text[start] !== '"') return null;
  let value = '';
  let escaped = false;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      value += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      return { value, nextIndex: index + 1 };
    } else {
      value += char;
    }
  }
  return null;
};

const extractTierCalls = (expression) => {
  const text = stripExprVersion(expression);
  const calls = [];
  let index = 0;
  while (index < text.length) {
    const tierIndex = text.indexOf('tier(', index);
    if (tierIndex < 0) break;
    const previous = text[tierIndex - 1];
    if (previous && /[A-Za-z0-9_]/.test(previous)) {
      index = tierIndex + 5;
      continue;
    }
    let cursor = tierIndex + 5;
    while (/\s/.test(text[cursor] || '')) cursor += 1;
    const label = readQuotedString(text, cursor);
    if (!label) {
      index = tierIndex + 5;
      continue;
    }
    cursor = label.nextIndex;
    while (/\s/.test(text[cursor] || '')) cursor += 1;
    if (text[cursor] !== ',') {
      index = tierIndex + 5;
      continue;
    }
    const closeIndex = findMatchingParen(text, tierIndex + 4);
    if (closeIndex < 0) break;
    calls.push({ label: label.value, body: text.slice(cursor + 1, closeIndex) });
    index = closeIndex + 1;
  }
  return calls;
};

const parseTokenPricingRows = (expression, t) => {
  const calls = extractTierCalls(expression);
  const sources = calls.length
    ? calls
    : [{ label: 'default', body: stripExprVersion(expression) }];
  const rows = [];
  const coefficientPattern = new RegExp(
    `\\b(${TOKEN_PRICING_VARS.map((item) => item.key).join('|')})\\s*\\*\\s*(${NUMBER_LITERAL})`,
    'g',
  );
  for (const source of sources) {
    const coefficients = new Map();
    let match;
    while ((match = coefficientPattern.exec(source.body)) !== null) {
      const price = Number(match[2]);
      if (Number.isFinite(price) && price > 0 && !coefficients.has(match[1])) {
        coefficients.set(match[1], price);
      }
    }
    for (const variable of TOKEN_PRICING_VARS) {
      const price = coefficients.get(variable.key);
      if (!Number.isFinite(price)) continue;
      const label = t ? t(variable.label) : variable.label;
      rows.push({
        label: sources.length > 1 && source.label ? `${source.label} ${label}` : label,
        match: '',
        price,
        unit: 'token',
      });
    }
  }
  return rows;
};

function convertedDisplayValue(rawPrice, sourceCurrency, multiplier, currency) {
  const raw = Number(rawPrice);
  if (!Number.isFinite(raw)) return null;

  const factor = Number(multiplier) > 0 ? Number(multiplier) : 1;
  const source = String(sourceCurrency || 'USD').toUpperCase();
  const code = String(currency?.code || 'CNY').toUpperCase();
  const rate = Number(currency?.rate || 1);
  const usdRate = Number(currency?.usdRate || rate || 1);

  let value = raw * factor;
  if (source === 'CNY') {
    value = code === 'CNY' ? value : (value / (usdRate || 1)) * rate;
  } else {
    value *= rate;
  }
  return value;
}

function unitSuffix(unit, t) {
  if (unit === 'second') return '/s';
  if (unit === 'token') return '/M';
  return `/${t ? t('pricing.perCallUnit') : 'call'}`;
}

export function formatPricingDetailRows(item, currency, t) {
  const details = item?.pricing_details;
  if (hasVideoPricingDetails(item)) {
    const sourceCurrency = details.currency || item?.price_currency || 'USD';
    const multiplier = Number(details.multiplier) > 0
      ? Number(details.multiplier)
      : Number(item?.price_multiplier) > 0
        ? Number(item.price_multiplier)
        : 1;
    const suffix = unitSuffix(details.unit, t);

    return details.items
      .map((row, index) => {
        const value = convertedDisplayValue(row.price, sourceCurrency, multiplier, currency);
        if (value == null) return null;
        return {
          label: row.label || `tier_${index + 1}`,
          match: row.match || '',
          price: Number(row.price),
          unit: details.unit || 'call',
          formatted: `${currency?.symbol || ''}${value.toFixed(4)}${suffix}`,
        };
      })
      .filter(Boolean);
  }

  if (item?.billing_type !== 'tiered_expr' || !item?.billing_expr) return [];

  const sourceCurrency = item?.price_currency || 'USD';
  const multiplier = Number(item?.price_multiplier) > 0
    ? Number(item.price_multiplier)
    : 1;
  const suffix = unitSuffix('token', t);

  return parseTokenPricingRows(item.billing_expr, t)
    .map((row, index) => {
      const value = convertedDisplayValue(row.price, sourceCurrency, multiplier, currency);
      if (value == null) return null;
      return {
        label: row.label || `tier_${index + 1}`,
        match: row.match || '',
        price: Number(row.price),
        unit: row.unit || 'token',
        formatted: `${currency?.symbol || ''}${value.toFixed(4)}${suffix}`,
      };
    })
    .filter(Boolean);
}
