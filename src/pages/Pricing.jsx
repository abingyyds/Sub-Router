import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { getSiteModels } from "../api";
import { useCurrency, useSite } from "../context/SiteContext";
import { getOfficialPrice } from "../utils/officialEquiv";
import {
  formatPricingDetailRows,
  hasVideoPricingDetails,
} from "../utils/pricingDetails";
import {
  formatOfficialVideoPriceRows,
  getOfficialVideoPriceRows,
} from "../utils/officialVideoPricing";

const MODEL_TYPE_OPTIONS = [
  { value: "", labelKey: "pricing.allTypes" },
  { value: "chat", labelKey: "pricing.typeChat" },
  { value: "completion", labelKey: "pricing.typeCompletion" },
  { value: "embedding", labelKey: "pricing.typeEmbedding" },
  { value: "image", labelKey: "pricing.typeImage" },
  { value: "audio", labelKey: "pricing.typeAudio" },
  { value: "video", labelKey: "pricing.typeVideo" },
  { value: "rerank", labelKey: "pricing.typeRerank" },
];

const MODEL_TYPE_SET = new Set(
  MODEL_TYPE_OPTIONS.map((item) => item.value).filter(Boolean),
);
const TURKISH_VENDOR_LABELS = {
  阿里巴巴: "Alibaba",
  阿里云: "Alibaba Cloud",
  百度: "Baidu",
  火山引擎: "Volcengine",
  腾讯: "Tencent",
  通义千问: "Qwen",
  智谱: "Zhipu AI",
  月之暗面: "Moonshot",
};
const PARAM_NAME_SET = new Set([
  "size",
  "resolution",
  "ratio",
  "width",
  "height",
  "seconds",
  "duration",
  "duration_seconds",
]);
const NUMBER_PATTERN = "[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?";

function splitTopLevelMultiply(expr = "") {
  const parts = [];
  let start = 0;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < expr.length; i += 1) {
    const char = expr[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    } else if (char === "*" && depth === 0) {
      parts.push(expr.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(expr.slice(start).trim());
  return parts.filter(Boolean);
}

function stripExprVersion(expr = "") {
  const match = String(expr).match(/^v\d+:([\s\S]*)$/);
  return match ? match[1] : String(expr || "");
}

function unwrapParens(expr = "") {
  let current = String(expr).trim();
  while (current.startsWith("(") && current.endsWith(")")) {
    let depth = 0;
    let valid = true;
    for (let i = 0; i < current.length; i += 1) {
      if (current[i] === "(") depth += 1;
      if (current[i] === ")") depth -= 1;
      if (depth === 0 && i < current.length - 1) {
        valid = false;
        break;
      }
    }
    if (!valid) break;
    current = current.slice(1, -1).trim();
  }
  return current;
}

function getTierBody(expr = "") {
  const body = stripExprVersion(expr).trim();
  const match = body.match(/^tier\("[^"]*",\s*([\s\S]+)\)$/);
  return match ? match[1] : "";
}

function deriveVideoPriceLabel(context, index) {
  const quoted = [...String(context).matchAll(/"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => value && !PARAM_NAME_SET.has(value));
  const preferred = quoted
    .slice()
    .reverse()
    .find(
      (value) =>
        /^\d{2,5}[x*]\d{2,5}$/i.test(value) || /^\d{3,4}p$/i.test(value),
    );
  if (preferred) return preferred.replace("*", "x");

  const sizeMatch = String(context).match(
    /param\("width"\)\s*==\s*(\d{2,5})\s*&&\s*param\("height"\)\s*==\s*(\d{2,5})/,
  );
  if (sizeMatch) return `${sizeMatch[1]}x${sizeMatch[2]}`;

  return `tier_${index + 1}`;
}

function parseVideoPricing(expr = "") {
  const tierBody = getTierBody(expr);
  if (!tierBody) return [];
  const parts = splitTopLevelMultiply(tierBody);
  const millionIndex = parts.findIndex((part) =>
    /^1000000(?:\.0+)?$/.test(part),
  );
  if (millionIndex <= 0) return [];
  const priceExpr = unwrapParens(parts[millionIndex - 1]);
  if (!priceExpr) return [];

  const rows = [];
  const priceRe = new RegExp(`\\?\\s*(${NUMBER_PATTERN})\\s*:`, "g");
  let match;
  while ((match = priceRe.exec(priceExpr)) !== null) {
    const price = Number(match[1]);
    if (!Number.isFinite(price) || price <= 0) continue;
    rows.push({
      label: deriveVideoPriceLabel(
        priceExpr.slice(Math.max(0, match.index - 260), match.index),
        rows.length,
      ),
      price,
    });
  }

  const fallbackMatch = priceExpr.match(
    new RegExp(`:\\s*(${NUMBER_PATTERN})\\s*\\)*$`),
  );
  const fallback = fallbackMatch ? Number(fallbackMatch[1]) : Number(priceExpr);
  if (Number.isFinite(fallback) && fallback > 0) {
    const hasSame = rows.some((row) => Math.abs(row.price - fallback) < 1e-12);
    if (!hasSame || rows.length === 0) {
      rows.push({
        label: rows.length === 0 ? "video" : "default",
        price: fallback,
      });
    }
  }

  return rows;
}

function normalizeModelType(model) {
  const category = String(model?.category || "")
    .trim()
    .toLowerCase();
  if (MODEL_TYPE_SET.has(category)) return category;

  const endpoints = Array.isArray(model?.supported_endpoint_types)
    ? model.supported_endpoint_types
    : [];
  const billingType = String(
    model?.billing_type || model?.billing_mode || "",
  ).toLowerCase();
  const name = String(
    model?.model_name || model?.display_name || "",
  ).toLowerCase();

  if (
    endpoints.includes("openai-video") ||
    getOfficialVideoPriceRows(model).length > 0 ||
    hasVideoPricingDetails(model) ||
    parseVideoPricing(model?.billing_expr).length > 0 ||
    /sora|seedance|kling|jimeng|veo|video/.test(name)
  )
    return "video";
  if (
    endpoints.includes("image-generation") ||
    /dall-e|imagen|flux|cogview|image/.test(name)
  )
    return "image";
  if (endpoints.includes("embeddings") || /embed|embedding/.test(name))
    return "embedding";
  if (endpoints.includes("jina-rerank") || /rerank/.test(name)) return "rerank";
  if (/whisper|tts|audio|speech|voxtral/.test(name)) return "audio";
  if (billingType === "completion" || /babbage|davinci|curie/.test(name))
    return "completion";
  return "chat";
}

function isPerCallPrice(item) {
  return item?.is_per_call || item?.billing_type === "per_call";
}

function isTieredExprPrice(item) {
  return (
    item?.is_tiered_expr ||
    item?.billing_type === "tiered_expr" ||
    item?.billing_mode === "tiered_expr"
  );
}

function isPriceUnavailable(item) {
  if (item?.pricing_source === "unconfigured") return true;
  if (getOfficialVideoPriceRows(item).length > 0) return false;
  if (isPerCallPrice(item) || isTieredExprPrice(item)) return false;
  return item?.input_price == null && item?.output_price == null;
}

function VideoPriceStack({ rows, label, tone = "default" }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const toneClass =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-page-success"
      : "border-page-divider bg-page-surface text-page";
  return (
    <div className="inline-flex min-w-[164px] flex-col gap-1 text-left">
      {label && (
        <span className="mb-0.5 text-[10px] font-medium text-page-muted">
          {label}
        </span>
      )}
      {rows.map((row) => (
        <span
          key={`${row.label}-${row.price}`}
          className={`flex items-center justify-between gap-3 rounded-lg border px-2 py-1 ${toneClass}`}
        >
          <span className="text-[11px] font-medium text-page-secondary">
            {row.label}
          </span>
          <span className="font-mono text-xs font-semibold">
            {row.formatted}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Pricing() {
  const { t, i18n } = useTranslation();
  const { site } = useSite();
  const { symbol, rate, code, usdRate } = useCurrency();
  const [models, setModels] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState("");
  const [modelType, setModelType] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedModels, setExpandedModels] = useState(() => new Set());
  const [restriction, setRestriction] = useState(null);
  const [unrestrictedTotal, setUnrestrictedTotal] = useState(0);
  const canViewProviders =
    site?.can_view_providers === true ||
    site?.full_mode === true ||
    site?.display_mode === "full";
  const getVendorLabel = (name) =>
    i18n.resolvedLanguage === "tr" ? TURKISH_VENDOR_LABELS[name] || name : name;

  useEffect(() => {
    getSiteModels({ include_official_channels: true })
      .then((r) => {
        if (r.data.success) {
          setModels(r.data.data || []);
          setVendors(r.data.vendors || []);
          setUnrestrictedTotal(Number(r.data.unrestricted_total || 0));
          setRestriction(
            r.data.region_restricted
              ? { region_restricted: true, message: r.data.message }
              : null,
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const enabledModels = models.filter((m) => m.enabled !== false);

  // Collect vendor names that actually have models
  const availableVendors = useMemo(() => {
    const vendorNames = new Set(
      enabledModels.map((m) => m.vendor_name).filter(Boolean),
    );
    return vendors.filter((v) => vendorNames.has(v.name));
  }, [enabledModels, vendors]);

  const filtered = useMemo(() => {
    let list = enabledModels;
    // Vendor filter
    if (vendor) {
      list = list.filter((m) => m.vendor_name === vendor);
    }
    // Model type filter
    if (modelType) {
      list = list.filter((m) => normalizeModelType(m) === modelType);
    }
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          (m.display_name || m.model_name || "").toLowerCase().includes(q) ||
          normalizeModelType(m).includes(q) ||
          (canViewProviders &&
            Array.isArray(m.channels) &&
            m.channels.some((ch) =>
              (ch.provider_name || ch.provider_slug || "")
                .toLowerCase()
                .includes(q),
            )),
      );
    }
    list = [...list].sort((a, b) => {
      const aTiered = isTieredExprPrice(a);
      const bTiered = isTieredExprPrice(b);
      if (aTiered !== bTiered) return aTiered ? 1 : -1;
      if (!!a.is_per_call !== !!b.is_per_call) {
        return a.is_per_call ? 1 : -1;
      }
      if (a.is_per_call) {
        return (Number(a.fixed_price) || 0) - (Number(b.fixed_price) || 0);
      }
      return (Number(a.input_price) || 0) - (Number(b.input_price) || 0);
    });
    return list;
  }, [canViewProviders, enabledModels, vendor, modelType, search]);
  const hasActiveFilter = Boolean(search.trim() || vendor || modelType);
  const restrictedEmpty =
    restriction?.region_restricted && hasActiveFilter && filtered.length === 0;
  const regionRestrictedNoModels =
    restriction?.region_restricted &&
    !hasActiveFilter &&
    enabledModels.length === 0 &&
    unrestrictedTotal > 0;
  const emptyMessage = regionRestrictedNoModels
    ? t("pricing.regionNoModels")
    : restrictedEmpty
      ? t("pricing.regionRestricted")
      : search || vendor || modelType
        ? t("pricing.noMatch")
        : t("pricing.noModels");

  const toggleModel = (key) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatTokenPrice = (price) =>
    price != null
      ? `${symbol}${(Number(price) * 1000 * rate).toFixed(4)}`
      : "-";

  const formatCacheCreationPrice = (modelName, price, price1h) => {
    if (price == null) return "-";
    const supportsDualCacheWindow = (modelName || "")
      .toLowerCase()
      .includes("claude");
    if (
      supportsDualCacheWindow &&
      price1h != null &&
      Math.abs(Number(price1h) - Number(price)) > 1e-12
    ) {
      return `${t("pricing.cacheCreation5m")} ${formatTokenPrice(price)} / ${t("pricing.cacheCreation1h")} ${formatTokenPrice(price1h)}`;
    }
    return formatTokenPrice(price);
  };

  const formatPerCallPrice = (price) =>
    price != null
      ? `${symbol}${(Number(price) * rate).toFixed(4)}/${t("pricing.perCallUnit")}`
      : "-";

  const formatVideoSecondPrice = (price, item = {}) => {
    const raw = Number(price);
    if (!Number.isFinite(raw)) return "-";
    const multiplier =
      Number(item.price_multiplier) > 0 ? Number(item.price_multiplier) : 1;
    const sourceCurrency = String(item.price_currency || "USD").toUpperCase();
    let displayValue = raw * multiplier;
    if (sourceCurrency === "CNY") {
      displayValue =
        code === "CNY" ? displayValue : (displayValue / (usdRate || 1)) * rate;
    } else {
      displayValue *= rate;
    }
    return `${symbol}${displayValue.toFixed(4)}/s`;
  };

  const formatUsdPrice = (price) => {
    if (price == null) return "-";
    const value = Number(price);
    if (!Number.isFinite(value)) return "-";
    const decimals = value >= 1 ? 2 : value >= 0.01 ? 3 : 4;
    return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "")}`;
  };

  const formatOfficialPrice = (model, official) => {
    const videoRows = formatOfficialVideoPriceRows(
      model,
      1,
      model?.price_currency || "USD",
      { symbol, rate, code, usdRate },
    );
    if (videoRows.length > 0) {
      return (
        <VideoPriceStack
          rows={videoRows}
          label={t("officialChannels.originalPrice")}
        />
      );
    }
    if (!official) return "-";
    return `${formatUsdPrice(official.inputPerMtok)} / ${formatUsdPrice(official.outputPerMtok)}`;
  };

  const formatSavings = (model, official) => {
    if (
      !official ||
      getOfficialVideoPriceRows(model).length > 0 ||
      isPerCallPrice(model) ||
      isTieredExprPrice(model)
    )
      return null;
    const siteInputPerMtok = Number(model.input_price) * 1000;
    if (
      !Number.isFinite(siteInputPerMtok) ||
      siteInputPerMtok <= 0 ||
      !official.inputPerMtok
    )
      return null;
    const savings = Math.round(
      (siteInputPerMtok / official.inputPerMtok - 1) * 100,
    );
    return savings < 0 ? `${savings}%` : null;
  };

  const getVideoRows = (item) => {
    const officialRows = formatOfficialVideoPriceRows(
      item,
      Number(item?.price_multiplier) > 0 ? Number(item.price_multiplier) : 1,
      item?.price_currency || "USD",
      { symbol, rate, code, usdRate },
    );
    if (officialRows.length > 0) return officialRows;
    const detailRows = formatPricingDetailRows(
      item,
      { symbol, rate, code, usdRate },
      t,
    );
    if (detailRows.length > 0) return detailRows;
    return parseVideoPricing(item?.billing_expr).map((row) => ({
      ...row,
      formatted: formatVideoSecondPrice(row.price, item),
    }));
  };

  const renderPrimaryPrice = (item) => {
    if (isPriceUnavailable(item)) return t("tokens.unavailable");
    const videoRows = getVideoRows(item);
    if (videoRows.length > 0) {
      return (
        <VideoPriceStack
          rows={videoRows}
          label={t("officialChannels.finalPrice")}
          tone="success"
        />
      );
    }
    if (isTieredExprPrice(item)) {
      return t("pricing.expressionPricing");
    }
    return isPerCallPrice(item)
      ? t("pricing.perCall")
      : formatTokenPrice(item.input_price);
  };

  const renderSecondaryPrice = (item, type, modelName) => {
    if (isPriceUnavailable(item)) return "-";
    if (getOfficialVideoPriceRows(item).length > 0) return "-";
    if (isTieredExprPrice(item)) return "-";
    if (isPerCallPrice(item)) {
      return type === "output" ? formatPerCallPrice(item.fixed_price) : "-";
    }
    if (type === "output") return formatTokenPrice(item.output_price);
    if (type === "cache_read") return formatTokenPrice(item.cache_read_price);
    return formatCacheCreationPrice(
      modelName || item.model_name,
      item.cache_creation_price,
      item.cache_creation_price_1h,
    );
  };

  const getChannelLabel = (channel, index) =>
    (channel.provider_name && getVendorLabel(channel.provider_name)) ||
    t("pricing.channelFallback", {
      number: channel.channel_index || index + 1,
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-heading font-bold text-page mb-3">
          {t("pricing.title")}
        </h1>
        <p className="text-page-secondary max-w-xl mx-auto">
          {t("pricing.subtitle")}
        </p>
      </div>

      {/* Vendor Filter */}
      {availableVendors.length > 0 && (
        <section aria-labelledby="pricing-vendor-filter" className="mb-6">
          <h2
            id="pricing-vendor-filter"
            className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-page-muted"
          >
            {t("pricing.vendor")}
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setVendor("")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                !vendor
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                  : "glass-sm text-page-secondary hover:text-page hover:bg-page-surface-hover"
              }`}
            >
              {t("pricing.allVendors")}
            </button>
            {availableVendors.map((v) => (
              <button
                key={v.id}
                onClick={() => setVendor(v.name)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  vendor === v.name
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                    : "glass-sm text-page-secondary hover:text-page hover:bg-page-surface-hover"
                }`}
              >
                {getVendorLabel(v.name)}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Model Type Filter */}
      <section aria-labelledby="pricing-type-filter" className="mb-6">
        <h2
          id="pricing-type-filter"
          className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-page-muted"
        >
          {t("pricing.modelType")}
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {MODEL_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value || "all"}
              onClick={() => setModelType(option.value)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                modelType === option.value
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                  : "glass-sm text-page-secondary hover:text-page hover:bg-page-surface-hover"
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </section>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-page-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-10"
            placeholder={t("pricing.searchPlaceholder")}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-page-secondary">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filtered.map((m, i) => {
              const official = getOfficialPrice(m);
              const savings = formatSavings(m, official);
              const channels = Array.isArray(m.channels) ? m.channels : [];
              const modelKey = `${m.model_name || "model"}-${m.id || i}`;
              const expanded = expandedModels.has(modelKey);
              const canExpand = canViewProviders && channels.length > 0;
              const hasOfficialVideoPricing =
                getOfficialVideoPriceRows(m).length > 0;
              const hasCacheRead = Number(m.cache_read_price) > 0;
              const hasCacheCreation =
                Number(m.cache_creation_price) > 0 ||
                Number(m.cache_creation_price_1h) > 0;
              const showTokenPrices = !hasOfficialVideoPricing;

              return (
                <article
                  key={modelKey}
                  className="overflow-hidden rounded-lg border border-page-divider bg-page-inset shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <h2 className="break-words font-mono text-sm font-semibold leading-5 text-page">
                        {m.display_name || m.model_name}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-600">
                          {t(`pricing.type.${normalizeModelType(m)}`)}
                        </span>
                        {canExpand && (
                          <span className="inline-flex rounded-full bg-page-surface px-2 py-0.5 text-[11px] font-medium text-page-secondary">
                            {t("pricing.channelCount", {
                              count: channels.length,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${
                        m.status === "healthy"
                          ? "border-green-500/20 bg-green-500/10 text-page-success"
                          : "border-page-divider bg-page-surface text-page-secondary"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${m.status === "healthy" ? "bg-green-500" : "bg-neutral-500"}`}
                      />
                      {m.status === "healthy"
                        ? t("pricing.online")
                        : t("pricing.unknown")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-4 border-t border-page-divider bg-page-surface/40 px-4 py-4">
                    {hasOfficialVideoPricing ? (
                      <div className="col-span-2 min-w-0 text-page-label">
                        <div className="mb-1 text-[11px] font-medium leading-4 text-page-secondary">
                          {t("officialChannels.finalPrice")}
                        </div>
                        {renderPrimaryPrice(m)}
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium leading-4 text-page-secondary">
                            {t("pricing.inputPriceShort")}
                          </div>
                          <div className="mt-1 break-words font-mono text-sm font-semibold text-page-label">
                            {renderPrimaryPrice(m)}
                          </div>
                        </div>
                        <div className="min-w-0 min-[420px]:text-right">
                          <div className="text-[11px] font-medium leading-4 text-page-secondary">
                            {t("pricing.outputPriceShort")}
                          </div>
                          <div className="mt-1 break-words font-mono text-sm font-semibold text-page-label">
                            {renderSecondaryPrice(m, "output")}
                          </div>
                        </div>
                      </>
                    )}

                    {showTokenPrices && hasCacheRead && (
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium leading-4 text-page-secondary">
                          {t("pricing.cacheReadShort")}
                        </div>
                        <div className="mt-1 break-words font-mono text-sm font-semibold text-page-label">
                          {renderSecondaryPrice(m, "cache_read")}
                        </div>
                      </div>
                    )}
                    {showTokenPrices && hasCacheCreation && (
                      <div className="min-w-0 min-[420px]:text-right">
                        <div className="text-[11px] font-medium leading-4 text-page-secondary">
                          {t("pricing.cacheCreationShort")}
                        </div>
                        <div className="mt-1 break-words font-mono text-sm font-semibold text-page-label">
                          {renderSecondaryPrice(m, "cache_creation")}
                        </div>
                      </div>
                    )}

                    {(official || hasOfficialVideoPricing) && (
                      <div className="col-span-2 flex min-w-0 items-start justify-between gap-3 border-t border-page-divider pt-3">
                        <span className="text-[11px] font-medium leading-4 text-page-secondary">
                          {t("pricing.officialPrice")}
                        </span>
                        <span className="min-w-0 break-words text-right font-mono text-xs font-semibold text-page-label">
                          {formatOfficialPrice(m, official)}
                        </span>
                      </div>
                    )}
                    {savings && (
                      <div className="col-span-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-medium text-page-secondary">
                          {t("pricing.savings")}
                        </span>
                        <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-page-success">
                          {savings}
                        </span>
                      </div>
                    )}
                  </div>

                  {canExpand && (
                    <button
                      type="button"
                      onClick={() => toggleModel(modelKey)}
                      className="flex w-full items-center justify-between gap-3 border-t border-page-divider px-4 py-3 text-left text-sm font-medium text-page-secondary transition-colors hover:bg-page-surface-hover hover:text-page"
                      aria-expanded={expanded}
                    >
                      <span>
                        {expanded
                          ? t("pricing.collapseChannels")
                          : t("pricing.expandChannels")}
                      </span>
                      {expanded ? (
                        <ChevronDown size={16} className="shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="shrink-0" />
                      )}
                    </button>
                  )}

                  {expanded && canExpand && (
                    <div className="border-t border-page-divider bg-page-surface">
                      {channels.map((channel, channelIndex) => (
                        <div
                          key={`${modelKey}-mobile-channel-${channel.provider_slug || channelIndex}`}
                          className="border-b border-page-divider px-4 py-4 last:border-0"
                        >
                          <div className="flex items-start gap-2.5">
                            {channel.provider_logo ? (
                              <img
                                src={channel.provider_logo}
                                alt=""
                                className="h-7 w-7 shrink-0 rounded-md object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-[10px] font-semibold text-brand-600">
                                {channel.channel_index || channelIndex + 1}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-1.5">
                                {channel.provider_website ? (
                                  <a
                                    href={channel.provider_website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="min-w-0 break-words font-medium text-page hover:text-brand-500"
                                  >
                                    {getChannelLabel(channel, channelIndex)}
                                  </a>
                                ) : (
                                  <span className="min-w-0 break-words font-medium text-page">
                                    {getChannelLabel(channel, channelIndex)}
                                  </span>
                                )}
                                {channel.provider_website && (
                                  <ExternalLink
                                    size={12}
                                    className="shrink-0 text-page-muted"
                                  />
                                )}
                              </div>
                              {channel.provider_description && (
                                <p className="mt-1 break-words text-xs leading-5 text-page-muted">
                                  {channel.provider_description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-3 border-t border-page-divider pt-3">
                            {[
                              [
                                t("pricing.inputPriceShort"),
                                renderPrimaryPrice(channel),
                              ],
                              [
                                t("pricing.outputPriceShort"),
                                renderSecondaryPrice(channel, "output"),
                              ],
                              [
                                t("pricing.cacheReadShort"),
                                renderSecondaryPrice(channel, "cache_read"),
                              ],
                              [
                                t("pricing.cacheCreationShort"),
                                renderSecondaryPrice(
                                  channel,
                                  "cache_creation",
                                  m.model_name,
                                ),
                              ],
                            ].map(([label, value], priceIndex) => (
                              <div
                                key={`${label}-${priceIndex}`}
                                className={`min-w-0 ${priceIndex % 2 ? "min-[420px]:text-right" : ""}`}
                              >
                                <div className="text-[11px] text-page-secondary">
                                  {label}
                                </div>
                                <div className="mt-0.5 break-words font-mono text-xs font-semibold text-page-label">
                                  {value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="glass-sm hidden overflow-x-auto rounded-xl lg:block">
          <table className="min-w-[1320px] w-full text-sm">
            <thead>
              <tr className="border-b border-page-divider">
                <th className="whitespace-nowrap text-left px-5 py-3.5 font-medium text-page-secondary">
                  {t("pricing.model")}
                </th>
                <th className="whitespace-nowrap text-right px-5 py-3.5 font-medium text-page-secondary">
                  {t("pricing.inputPrice")}
                </th>
                <th className="whitespace-nowrap text-right px-5 py-3.5 font-medium text-page-secondary">
                  {t("pricing.outputPrice")}
                </th>
                <th className="whitespace-nowrap text-right px-5 py-3.5 font-medium text-page-secondary">
                  {t("pricing.cacheReadPrice")}
                </th>
                <th className="whitespace-nowrap text-right px-5 py-3.5 font-medium text-page-secondary">
                  {t("pricing.cacheCreationPrice")}
                </th>
                <th className="text-right px-5 py-3.5 font-medium text-page-secondary whitespace-nowrap">
                  {t("pricing.officialPrice")}
                </th>
                <th className="text-right px-5 py-3.5 font-medium text-page-secondary whitespace-nowrap">
                  {t("pricing.savings")}
                </th>
                <th className="whitespace-nowrap text-center px-5 py-3.5 font-medium text-page-secondary">
                  {t("pricing.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const official = getOfficialPrice(m);
                const savings = formatSavings(m, official);
                const channels = Array.isArray(m.channels) ? m.channels : [];
                const modelKey = `${m.model_name || "model"}-${m.id || i}`;
                const expanded = expandedModels.has(modelKey);
                const canExpand = canViewProviders && channels.length > 0;
                const hasOfficialVideoPricing =
                  getOfficialVideoPriceRows(m).length > 0;

                return (
                  <React.Fragment key={modelKey}>
                    <tr className="border-b border-page-divider last:border-0 hover:bg-page-surface transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-[260px] items-center gap-2">
                          <button
                            type="button"
                            onClick={() => canExpand && toggleModel(modelKey)}
                            disabled={!canExpand}
                            className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-page-divider transition-colors ${
                              canExpand
                                ? "text-page-secondary hover:bg-page-surface-hover hover:text-page"
                                : "cursor-default text-page-muted opacity-40"
                            }`}
                            aria-label={
                              expanded
                                ? t("pricing.collapseChannels")
                                : t("pricing.expandChannels")
                            }
                          >
                            {expanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                          <div className="min-w-0">
                            <span className="block whitespace-nowrap font-mono text-page">
                              {m.display_name || m.model_name}
                            </span>
                            {canExpand && (
                              <span className="mt-1 inline-flex rounded-full bg-page-surface px-2 py-0.5 text-[11px] font-medium text-page-secondary">
                                {t("pricing.channelCount", {
                                  count: channels.length,
                                })}
                              </span>
                            )}
                            <span className="mt-1 inline-flex rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-600">
                              {t(`pricing.type.${normalizeModelType(m)}`)}
                            </span>
                          </div>
                        </div>
                      </td>
                      {hasOfficialVideoPricing ? (
                        <td
                          colSpan={4}
                          className="whitespace-nowrap px-5 py-3.5 text-right text-page-label"
                        >
                          {renderPrimaryPrice(m)}
                        </td>
                      ) : (
                        <>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-page-label">
                            {renderPrimaryPrice(m)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-page-label">
                            {renderSecondaryPrice(m, "output")}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-page-label">
                            {renderSecondaryPrice(m, "cache_read")}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                            {renderSecondaryPrice(m, "cache_creation")}
                          </td>
                        </>
                      )}
                      <td className="px-5 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                        {formatOfficialPrice(m, official)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {savings ? (
                          <span
                            className={`inline-flex justify-end rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${
                              savings.startsWith("-")
                                ? "bg-green-500/10 text-page-success"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {savings}
                          </span>
                        ) : (
                          <span className="font-mono text-page-muted">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${
                            m.status === "healthy"
                              ? "bg-green-500/10 text-page-success border-green-500/20"
                              : "bg-page-surface text-page-secondary border-page-divider"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${m.status === "healthy" ? "bg-green-500" : "bg-neutral-500"}`}
                          />
                          {m.status === "healthy"
                            ? t("pricing.online")
                            : t("pricing.unknown")}
                        </span>
                      </td>
                    </tr>
                    {expanded && canExpand && (
                      <tr className="border-b border-page-divider bg-page-surface">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="overflow-x-auto rounded-lg border border-page-divider bg-page-inset">
                            <table className="min-w-[780px] w-full text-xs">
                              <thead>
                                <tr className="border-b border-page-divider text-page-secondary">
                                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">
                                    {t("pricing.channel")}
                                  </th>
                                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                                    {t("pricing.inputPriceShort")}
                                  </th>
                                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                                    {t("pricing.outputPriceShort")}
                                  </th>
                                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                                    {t("pricing.cacheReadShort")}
                                  </th>
                                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                                    {t("pricing.cacheCreationShort")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {channels.map((channel, channelIndex) => {
                                  return (
                                    <tr
                                      key={`${modelKey}-channel-${channel.provider_slug || channelIndex}`}
                                      className="border-b border-page-divider last:border-0"
                                    >
                                      <td className="px-4 py-3">
                                        <div className="flex min-w-[260px] items-center gap-2">
                                          {channel.provider_logo ? (
                                            <img
                                              src={channel.provider_logo}
                                              alt=""
                                              className="h-6 w-6 rounded-md object-cover"
                                              loading="lazy"
                                            />
                                          ) : (
                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/10 text-[10px] font-semibold text-brand-600">
                                              {channel.channel_index ||
                                                channelIndex + 1}
                                            </span>
                                          )}
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              {channel.provider_website ? (
                                                <a
                                                  href={
                                                    channel.provider_website
                                                  }
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="whitespace-nowrap font-medium text-page hover:text-brand-500"
                                                >
                                                  {getChannelLabel(
                                                    channel,
                                                    channelIndex,
                                                  )}
                                                </a>
                                              ) : (
                                                <span className="whitespace-nowrap font-medium text-page">
                                                  {getChannelLabel(
                                                    channel,
                                                    channelIndex,
                                                  )}
                                                </span>
                                              )}
                                              {channel.provider_website && (
                                                <ExternalLink
                                                  size={11}
                                                  className="flex-shrink-0 text-page-muted"
                                                />
                                              )}
                                            </div>
                                            {channel.provider_description && (
                                              <p className="mt-0.5 max-w-lg break-words text-[11px] leading-4 text-page-muted">
                                                {channel.provider_description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-page-label">
                                        {renderPrimaryPrice(channel)}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-page-label">
                                        {renderSecondaryPrice(
                                          channel,
                                          "output",
                                        )}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-page-label">
                                        {renderSecondaryPrice(
                                          channel,
                                          "cache_read",
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-page-label whitespace-nowrap">
                                        {renderSecondaryPrice(
                                          channel,
                                          "cache_creation",
                                          m.model_name,
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
