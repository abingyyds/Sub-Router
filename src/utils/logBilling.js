const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const hasSitePricingSnapshot = (other) =>
  ["per_token", "per_call", "tiered_expr"].includes(
    String(other?.site_billing_mode || "").trim(),
  );

export const formatSitePrice = (value, symbol = "$", rate = 1, unit = "/M") => {
  const amount = numberValue(value) * numberValue(rate || 1);
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount > 0 && amount < 0.01 ? 6 : 4,
    maximumFractionDigits: 6,
  })}${unit}`;
};

export const formatSiteQuota = (quota, symbol = "$", rate = 1) => {
  const amount = (numberValue(quota) / 500000) * numberValue(rate || 1);
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount > 0 && amount < 0.01 ? 4 : 2,
    maximumFractionDigits: 6,
  })}`;
};

const pricePart = (other, field, label, symbol, rate, unit = "/M") => {
  if (!hasOwn(other, field)) return null;
  return `${label} ${formatSitePrice(other[field], symbol, rate, unit)}`;
};

export function getSitePricingDetails(other, symbol, rate, t) {
  const mode = String(other?.site_billing_mode || "").trim();
  if (!mode) return [];
  if (mode === "tiered_expr") {
    return [{ key: t("定价方式"), value: t("动态定价") }];
  }
  if (mode === "per_call") {
    return [
      { key: t("定价方式"), value: t("按次计费") },
      {
        key: t("价格"),
        value: hasOwn(other, "site_fixed_price")
          ? formatSitePrice(
              other.site_fixed_price,
              symbol,
              rate,
              ` / ${t("次")}`,
            )
          : "-",
      },
    ];
  }
  if (mode !== "per_token") return [];

  const details = [{ key: t("定价方式"), value: t("按量计费") }];
  const parts = [
    pricePart(other, "site_input_price", t("输入"), symbol, rate),
    pricePart(other, "site_output_price", t("输出"), symbol, rate),
    pricePart(other, "site_cache_read_price", t("缓存读取"), symbol, rate),
    pricePart(other, "site_cache_creation_price", t("缓存创建"), symbol, rate),
    pricePart(
      other,
      "site_cache_creation_price_5m",
      t("缓存创建 (5m)"),
      symbol,
      rate,
    ),
    pricePart(
      other,
      "site_cache_creation_price_1h",
      t("缓存创建 (1h)"),
      symbol,
      rate,
    ),
    pricePart(other, "site_image_input_price", t("图片输入"), symbol, rate),
    pricePart(other, "site_audio_input_price", t("音频输入"), symbol, rate),
    pricePart(other, "site_audio_output_price", t("音频输出"), symbol, rate),
    pricePart(
      other,
      "site_separate_audio_input_price",
      t("独立音频输入"),
      symbol,
      rate,
    ),
    pricePart(
      other,
      "site_web_search_price",
      t("Web 搜索"),
      symbol,
      rate,
      "/1K",
    ),
    pricePart(
      other,
      "site_file_search_price",
      t("文件搜索"),
      symbol,
      rate,
      "/1K",
    ),
    pricePart(
      other,
      "site_image_generation_call_price",
      t("图片生成调用"),
      symbol,
      rate,
      ` / ${t("次")}`,
    ),
  ].filter(Boolean);
  if (parts.length > 0) {
    details.push({ key: t("价格"), value: parts.join(" · ") });
  }
  return details;
}

const addTokenLine = (lines, label, tokens, price, symbol, rate) => {
  if (tokens <= 0 || !hasOwn(price, "value")) return;
  lines.push(
    `${label} ${tokens.toLocaleString()} tokens / 1M * ${formatSitePrice(price.value, symbol, rate)}`,
  );
};

const addPriceLine = (lines, label, tokens, other, field, symbol, rate) => {
  if (tokens <= 0 || !hasOwn(other, field)) return;
  addTokenLine(lines, label, tokens, { value: other[field] }, symbol, rate);
};

export function getSiteBillingLines(log, other, symbol, rate, t) {
  const mode = String(other?.site_billing_mode || "").trim();
  if (!mode || mode === "tiered_expr") return [];
  if (mode === "per_call") {
    const lines = [
      `${t("按次计费")}：${formatSitePrice(other.site_fixed_price, symbol, rate, "")} / ${t("次")}`,
    ];
    lines.push(`${t("总费用")} = ${formatSiteQuota(log?.quota, symbol, rate)}`);
    return lines;
  }
  if (mode !== "per_token") return [];

  const inputTokens = Math.max(0, numberValue(log?.prompt_tokens));
  const outputTokens = Math.max(0, numberValue(log?.completion_tokens));
  const cacheReadTokens = Math.max(0, numberValue(other?.cache_tokens));
  const cacheWriteTokens = Math.max(
    0,
    numberValue(other?.cache_creation_tokens),
  );
  const cacheWrite5mTokens = Math.max(
    0,
    numberValue(other?.cache_creation_tokens_5m),
  );
  const cacheWrite1hTokens = Math.max(
    0,
    numberValue(other?.cache_creation_tokens_1h),
  );
  const hasSplitCacheWrites = cacheWrite5mTokens > 0 || cacheWrite1hTokens > 0;
  const isAnthropicUsage = Boolean(
    other?.claude || other?.usage_semantic === "anthropic",
  );
  const imageTokens = Math.max(0, numberValue(other?.image_output));
  const separateAudioTokens = Math.max(
    0,
    numberValue(other?.audio_input_token_count),
  );
  const genericAudio = Boolean(other?.audio || other?.ws);
  let regularInputTokens = inputTokens;
  if (!isAnthropicUsage && !genericAudio) {
    regularInputTokens -= cacheReadTokens;
    regularInputTokens -= hasSplitCacheWrites
      ? cacheWrite5mTokens + cacheWrite1hTokens
      : cacheWriteTokens;
    regularInputTokens -= imageTokens + separateAudioTokens;
    regularInputTokens = Math.max(0, regularInputTokens);
  }

  const lines = [];
  if (genericAudio) {
    addPriceLine(
      lines,
      t("文字输入"),
      Math.max(0, numberValue(other?.text_input) || regularInputTokens),
      other,
      "site_input_price",
      symbol,
      rate,
    );
    addPriceLine(
      lines,
      t("音频输入"),
      Math.max(0, numberValue(other?.audio_input)),
      other,
      "site_audio_input_price",
      symbol,
      rate,
    );
    addPriceLine(
      lines,
      t("音频输出"),
      Math.max(0, numberValue(other?.audio_output)),
      other,
      "site_audio_output_price",
      symbol,
      rate,
    );
    addPriceLine(
      lines,
      t("文字输出"),
      Math.max(0, numberValue(other?.text_output) || outputTokens),
      other,
      "site_output_price",
      symbol,
      rate,
    );
  } else {
    addPriceLine(
      lines,
      t("输入"),
      regularInputTokens,
      other,
      "site_input_price",
      symbol,
      rate,
    );
    addPriceLine(
      lines,
      t("图片输入"),
      imageTokens,
      other,
      "site_image_input_price",
      symbol,
      rate,
    );
    addPriceLine(
      lines,
      t("独立音频输入"),
      separateAudioTokens,
      other,
      "site_separate_audio_input_price",
      symbol,
      rate,
    );
  }

  addPriceLine(
    lines,
    t("缓存读取"),
    cacheReadTokens,
    other,
    "site_cache_read_price",
    symbol,
    rate,
  );
  addPriceLine(
    lines,
    t("缓存写入"),
    hasSplitCacheWrites ? 0 : cacheWriteTokens,
    other,
    "site_cache_creation_price",
    symbol,
    rate,
  );
  addPriceLine(
    lines,
    t("缓存写入 (5m)"),
    cacheWrite5mTokens,
    other,
    "site_cache_creation_price_5m",
    symbol,
    rate,
  );
  addPriceLine(
    lines,
    t("缓存写入 (1h)"),
    cacheWrite1hTokens,
    other,
    "site_cache_creation_price_1h",
    symbol,
    rate,
  );
  if (!genericAudio) {
    addPriceLine(
      lines,
      t("输出"),
      outputTokens,
      other,
      "site_output_price",
      symbol,
      rate,
    );
  }

  const webSearchCalls = Math.max(0, numberValue(other?.web_search_call_count));
  if (webSearchCalls > 0 && hasOwn(other, "site_web_search_price")) {
    lines.push(
      `${t("Web 搜索")} ${webSearchCalls.toLocaleString()} 次 / 1K * ${formatSitePrice(other.site_web_search_price, symbol, rate, "/1K")}`,
    );
  }
  const fileSearchCalls = Math.max(
    0,
    numberValue(other?.file_search_call_count),
  );
  if (fileSearchCalls > 0 && hasOwn(other, "site_file_search_price")) {
    lines.push(
      `${t("文件搜索")} ${fileSearchCalls.toLocaleString()} 次 / 1K * ${formatSitePrice(other.site_file_search_price, symbol, rate, "/1K")}`,
    );
  }
  if (
    other?.image_generation_call &&
    hasOwn(other, "site_image_generation_call_price")
  ) {
    lines.push(
      `${t("图片生成调用")} * ${formatSitePrice(other.site_image_generation_call_price, symbol, rate, ` / ${t("次")}`)}`,
    );
  }
  if (lines.length > 0) {
    lines.push(`${t("总费用")} = ${formatSiteQuota(log?.quota, symbol, rate)}`);
  }
  return lines;
}
