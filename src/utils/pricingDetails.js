export function hasVideoPricingDetails(item) {
  const details = item?.pricing_details;
  return details?.type === 'video' && Array.isArray(details.items) && details.items.length > 0;
}

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
  return `/${t ? t('pricing.perCallUnit') : 'call'}`;
}

export function formatPricingDetailRows(item, currency, t) {
  const details = item?.pricing_details;
  if (!hasVideoPricingDetails(item)) return [];

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
