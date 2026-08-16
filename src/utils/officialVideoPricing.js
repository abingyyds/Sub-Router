const normalizePricingInput = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    if (Array.isArray(value.prices)) return value;
    return normalizePricingInput(
      value.video_pricing || value.official_video_pricing,
    );
  }
  try {
    const parsed = JSON.parse(String(value));
    return parsed && Array.isArray(parsed.prices) ? parsed : null;
  } catch {
    return null;
  }
};

export const parseOfficialVideoPricing = (value) =>
  normalizePricingInput(value);

export const getOfficialVideoPriceRows = (value, multiplier = 1) => {
  const pricing = normalizePricingInput(value);
  const ratio = Number(multiplier);
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  return (pricing?.prices || [])
    .map((item, index) => ({
      label: String(item?.label || item?.match || `Tier ${index + 1}`),
      price: Number(item?.price_per_second || 0) * safeRatio,
    }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0);
};

const convertedDisplayValue = (price, sourceCurrency, currency) => {
  const raw = Number(price);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const source = String(sourceCurrency || "USD").toUpperCase();
  const code = String(currency?.code || "USD").toUpperCase();
  const rate = Number(currency?.rate || 1);
  const usdRate = Number(currency?.usdRate || rate || 1);
  if (source === "CNY") {
    return code === "CNY" ? raw : (raw / (usdRate || 1)) * rate;
  }
  return raw * rate;
};

export const formatOfficialVideoUnitPrice = (
  price,
  sourceCurrency = "USD",
  currency = { symbol: "$", code: "USD", rate: 1, usdRate: 1 },
) => {
  const displayValue = convertedDisplayValue(price, sourceCurrency, currency);
  if (displayValue <= 0) return "";
  return `${currency?.symbol || "$"}${displayValue
    .toFixed(displayValue < 0.01 ? 6 : 4)
    .replace(/\.?0+$/, "")}/s`;
};

export const formatOfficialVideoPriceRows = (
  value,
  multiplier = 1,
  sourceCurrency = "USD",
  currency,
) =>
  getOfficialVideoPriceRows(value, multiplier).map((row) => ({
    ...row,
    formatted: formatOfficialVideoUnitPrice(
      row.price,
      sourceCurrency,
      currency,
    ),
  }));

export const formatOfficialVideoPriceSummary = (
  value,
  multiplier = 1,
  sourceCurrency = "USD",
  currency,
) => {
  const rows = formatOfficialVideoPriceRows(
    value,
    multiplier,
    sourceCurrency,
    currency,
  );
  if (rows.length === 0) return "";
  return rows.map((row) => `${row.label} ${row.formatted}`).join(" · ");
};
