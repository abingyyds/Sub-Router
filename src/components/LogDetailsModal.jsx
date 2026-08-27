import React from "react";
import { Copy, X } from "lucide-react";
import { Q } from "../api";

const n = (value) => Number(value || 0).toLocaleString();

function LogDetailsModal({ open, onClose, log, t, symbol, rate }) {
  if (!open || !log) return null;
  let other = {};
  try {
    other = log.other ? JSON.parse(log.other) || {} : {};
  } catch (e) {
    other = {};
  }
  const money = (quota) => {
    const value = (Number(quota || 0) / Q) * Number(rate || 1);
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2, maximumFractionDigits: 6 })}`;
  };
  const price = (usd) =>
    `${symbol}${(Number(usd || 0) * Number(rate || 1)).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}/M`;
  const duration = Number(log.use_time || 0);
  const frt = Number(other.frt || 0);
  const tps = duration > 0 ? Number(log.completion_tokens || 0) / duration : 0;
  const cacheReadTokens = Number(other.cache_tokens || 0);
  const cacheWriteTokens = Number(other.cache_creation_tokens || 0);
  const cacheWrite5mTokens = Number(other.cache_creation_tokens_5m || 0);
  const cacheWrite1hTokens = Number(other.cache_creation_tokens_1h || 0);
  const hasSplitCacheWrites = cacheWrite5mTokens > 0 || cacheWrite1hTokens > 0;
  // Distributor responses intentionally remove internal model ratios/prices.
  // Prefer the customer-facing site snapshot whenever it is available so the
  // detail view still reflects the price that was actually offered to users.
  const siteBillingMode = String(other.site_billing_mode || "").trim();
  const basePrice =
    Number(other.site_input_price || 0) > 0
      ? Number(other.site_input_price)
      : Number(other.model_ratio || 0) * 2;
  const groupRatio = Number.isFinite(Number(other.site_group_ratio))
    ? other.site_group_ratio
    : other.user_group_ratio !== undefined &&
        Number(other.user_group_ratio) !== -1
      ? other.user_group_ratio
      : other.group_ratio;
  const isTieredBilling =
    siteBillingMode === "tiered_expr" ||
    (!siteBillingMode && other.billing_mode === "tiered_expr");
  const isPerCallBilling =
    siteBillingMode === "per_call" ||
    (!siteBillingMode &&
      !isTieredBilling &&
      Number(other.model_price || 0) > 0);
  const billingMode = isTieredBilling
    ? t("动态定价")
    : isPerCallBilling
      ? t("按次计费")
      : t("按 Token");
  const outputPrice =
    Number(other.site_output_price || 0) > 0
      ? Number(other.site_output_price)
      : basePrice * Number(other.completion_ratio || 0);
  const cacheReadPrice =
    Number(other.site_cache_read_price || 0) > 0
      ? Number(other.site_cache_read_price)
      : basePrice * Number(other.cache_ratio || 1);
  const cacheCreatePrice =
    Number(other.site_cache_creation_price || 0) > 0
      ? Number(other.site_cache_creation_price)
      : basePrice * Number(other.cache_creation_ratio || 1);
  const cacheCreate5mPrice =
    Number(other.site_cache_creation_price_5m || 0) > 0
      ? Number(other.site_cache_creation_price_5m)
      : basePrice * Number(other.cache_creation_ratio_5m || 1);
  const cacheCreate1hPrice =
    Number(other.site_cache_creation_price_1h || 0) > 0
      ? Number(other.site_cache_creation_price_1h)
      : basePrice * Number(other.cache_creation_ratio_1h || 1);
  const rows = [
    [t("时间"), new Date(Number(log.created_at || 0) * 1000).toLocaleString()],
    [t("请求 ID"), log.request_id, true],
    [t("上游请求 ID"), log.upstream_request_id, true],
    [t("令牌"), log.token_name],
    [t("分组"), log.group || other.group],
    [t("IP 地址"), log.ip],
    [
      t("响应时间"),
      `${duration.toFixed(1)}s${log.is_stream && frt > 0 ? ` (FRT: ${(frt / 1000).toFixed(1)}s)` : ""}`,
    ],
    [
      t("流速"),
      log.is_stream && tps > 0
        ? `${tps.toFixed(1)} t/s`
        : t(log.is_stream ? "流" : "非流"),
    ],
    [t("推理强度"), other.reasoning_effort],
  ];
  const billingRows = [
    [t("输入 Token"), n(log.prompt_tokens)],
    [t("输出 Token"), n(log.completion_tokens)],
    ...(cacheReadTokens > 0 ? [[t("缓存读取"), n(cacheReadTokens)]] : []),
    ...(!hasSplitCacheWrites && cacheWriteTokens > 0
      ? [[t("缓存写入"), n(cacheWriteTokens)]]
      : []),
    ...(cacheWrite5mTokens > 0
      ? [[t("缓存写入 (5m)"), n(cacheWrite5mTokens)]]
      : []),
    ...(cacheWrite1hTokens > 0
      ? [[t("缓存写入 (1h)"), n(cacheWrite1hTokens)]]
      : []),
    [t("计费模式"), billingMode],
    ...(!isTieredBilling && !isPerCallBilling
      ? [
          [t("输入"), price(basePrice)],
          [t("输出"), price(outputPrice)],
          ...(cacheReadTokens > 0
            ? [[t("缓存读取价格"), price(cacheReadPrice)]]
            : []),
          ...(!hasSplitCacheWrites && cacheWriteTokens > 0
            ? [[t("缓存创建价格"), price(cacheCreatePrice)]]
            : []),
          ...(cacheWrite5mTokens > 0
            ? [[t("缓存创建 (5m)"), price(cacheCreate5mPrice)]]
            : []),
          ...(cacheWrite1hTokens > 0
            ? [[t("缓存创建 (1h)"), price(cacheCreate1hPrice)]]
            : []),
        ]
      : []),
    [
      t("专属倍率"),
      Number.isFinite(Number(groupRatio))
        ? `${Number(groupRatio).toFixed(4)}x`
        : "-",
    ],
    [t("总费用"), money(log.quota)],
  ];
  const providerPricing = (() => {
    if (other.provider_billing_mode === "per_call") {
      return `${t("按次计费")} · ${symbol}${(Number(other.provider_fixed_price || 0) * Number(rate || 1)).toFixed(6)} / ${t("次")}`;
    }
    if (other.provider_billing_mode !== "per_token") return "";
    const providerCacheCreate5m = Number(
      other.provider_cache_creation_price_5m || 0,
    );
    const providerCacheCreate = Number(
      other.provider_cache_creation_price || 0,
    );
    const providerCacheCreate1h = Number(
      other.provider_cache_creation_price_1h || 0,
    );
    const parts = [
      Number(other.provider_input_price || 0) > 0 &&
        `${t("输入")} ${price(other.provider_input_price)}`,
      Number(other.provider_output_price || 0) > 0 &&
        `${t("输出")} ${price(other.provider_output_price)}`,
      Number(other.provider_cache_read_price || 0) > 0 &&
        `${t("缓存读取")} ${price(other.provider_cache_read_price)}`,
      providerCacheCreate5m > 0 &&
        `${t("缓存创建 (5m)")} ${price(providerCacheCreate5m)}`,
      providerCacheCreate1h > 0 &&
        `${t("缓存创建 (1h)")} ${price(providerCacheCreate1h)}`,
      providerCacheCreate5m <= 0 &&
        providerCacheCreate1h <= 0 &&
        providerCacheCreate > 0 &&
        `${t("缓存创建")} ${price(providerCacheCreate)}`,
    ].filter(Boolean);
    return `${t("按量计费")} · ${parts.join(" · ")}`;
  })();
  const sitePricing = (() => {
    if (other.site_billing_mode === "per_call") {
      return `${t("按次计费")} · ${symbol}${(Number(other.site_fixed_price || 0) * Number(rate || 1)).toFixed(6)} / ${t("次")}`;
    }
    if (other.site_billing_mode !== "per_token") return "";
    const parts = [
      Number(other.site_input_price || 0) > 0 &&
        `${t("输入")} ${price(other.site_input_price)}`,
      Number(other.site_output_price || 0) > 0 &&
        `${t("输出")} ${price(other.site_output_price)}`,
      Number(other.site_cache_read_price || 0) > 0 &&
        `${t("缓存读取")} ${price(other.site_cache_read_price)}`,
      Number(other.site_cache_creation_price_5m || 0) > 0 &&
        `${t("缓存创建 (5m)")} ${price(other.site_cache_creation_price_5m)}`,
      Number(other.site_cache_creation_price_1h || 0) > 0 &&
        `${t("缓存创建 (1h)")} ${price(other.site_cache_creation_price_1h)}`,
      Number(other.site_cache_creation_price_5m || 0) <= 0 &&
        Number(other.site_cache_creation_price_1h || 0) <= 0 &&
        Number(other.site_cache_creation_price || 0) > 0 &&
        `${t("缓存创建")} ${price(other.site_cache_creation_price)}`,
    ].filter(Boolean);
    return `${t("按量计费")} · ${parts.join(" · ")}`;
  })();
  const copyValue = async (event, value) => {
    event.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {
      /* clipboard unavailable */
    }
  };
  const Section = ({ title, values }) => (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-page-secondary">
        {title}
      </h3>
      <dl className="rounded-lg border border-page-divider bg-page-surface/50 px-3">
        {values.map(([label, value, copyable]) => (
          <div
            key={label}
            className="grid grid-cols-[minmax(7rem,34%)_1fr] gap-3 border-b border-page-divider/60 py-2 last:border-0"
          >
            <dt className="text-xs text-page-secondary">{label}</dt>
            <dd className="min-w-0 break-words text-sm text-page">
              {value !== undefined && value !== null && value !== "" ? (
                copyable ? (
                  <button
                    type="button"
                    className="inline-flex max-w-full items-center gap-1 font-mono text-xs hover:text-brand-500"
                    onClick={(event) => copyValue(event, value)}
                  >
                    <span className="truncate">{value}</span>
                    <Copy className="h-3 w-3" />
                  </button>
                ) : (
                  value
                )
              ) : (
                "-"
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-page-divider bg-page p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-page">{t("日志详情")}</h2>
            <p className="text-sm text-page-secondary">
              {t("查看此日志条目的完整详情")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary p-2"
            title={t("关闭")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <Section title={t("概览")} values={rows} />
          <Section title={t("令牌消耗与计费")} values={billingRows} />
          {(other.provider_name ||
            providerPricing ||
            sitePricing ||
            other.request_path ||
            log.content) && (
            <Section
              title={t("上游与附加信息")}
              values={[
                [t("供应商"), other.provider_name],
                [t("供应商定价"), providerPricing],
                [t("分站定价"), sitePricing],
                [t("请求路径"), other.request_path],
                [t("内容"), log.content],
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default LogDetailsModal;
