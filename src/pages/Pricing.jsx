import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { getSiteModels } from '../api';
import { useCurrency } from '../context/SiteContext';
import { getOfficialPrice } from '../utils/officialEquiv';

const MODEL_TYPE_OPTIONS = [
  { value: '', labelKey: 'pricing.allTypes' },
  { value: 'chat', labelKey: 'pricing.typeChat' },
  { value: 'completion', labelKey: 'pricing.typeCompletion' },
  { value: 'embedding', labelKey: 'pricing.typeEmbedding' },
  { value: 'image', labelKey: 'pricing.typeImage' },
  { value: 'audio', labelKey: 'pricing.typeAudio' },
  { value: 'video', labelKey: 'pricing.typeVideo' },
  { value: 'rerank', labelKey: 'pricing.typeRerank' },
];

const MODEL_TYPE_SET = new Set(MODEL_TYPE_OPTIONS.map((item) => item.value).filter(Boolean));
const PARAM_NAME_SET = new Set([
  'size',
  'resolution',
  'ratio',
  'width',
  'height',
  'seconds',
  'duration',
  'duration_seconds',
]);
const NUMBER_PATTERN = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?';

function splitTopLevelMultiply(expr = '') {
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
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    } else if (char === '*' && depth === 0) {
      parts.push(expr.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(expr.slice(start).trim());
  return parts.filter(Boolean);
}

function stripExprVersion(expr = '') {
  const match = String(expr).match(/^v\d+:([\s\S]*)$/);
  return match ? match[1] : String(expr || '');
}

function unwrapParens(expr = '') {
  let current = String(expr).trim();
  while (current.startsWith('(') && current.endsWith(')')) {
    let depth = 0;
    let valid = true;
    for (let i = 0; i < current.length; i += 1) {
      if (current[i] === '(') depth += 1;
      if (current[i] === ')') depth -= 1;
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

function getTierBody(expr = '') {
  const body = stripExprVersion(expr).trim();
  const match = body.match(/^tier\("[^"]*",\s*([\s\S]+)\)$/);
  return match ? match[1] : '';
}

function deriveVideoPriceLabel(context, index) {
  const quoted = [...String(context).matchAll(/"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => value && !PARAM_NAME_SET.has(value));
  const preferred = quoted
    .slice()
    .reverse()
    .find((value) => /^\d{2,5}[x*]\d{2,5}$/i.test(value) || /^\d{3,4}p$/i.test(value));
  if (preferred) return preferred.replace('*', 'x');

  const sizeMatch = String(context).match(/param\("width"\)\s*==\s*(\d{2,5})\s*&&\s*param\("height"\)\s*==\s*(\d{2,5})/);
  if (sizeMatch) return `${sizeMatch[1]}x${sizeMatch[2]}`;

  return `tier_${index + 1}`;
}

function parseVideoPricing(expr = '') {
  const tierBody = getTierBody(expr);
  if (!tierBody) return [];
  const parts = splitTopLevelMultiply(tierBody);
  const millionIndex = parts.findIndex((part) => /^1000000(?:\.0+)?$/.test(part));
  if (millionIndex <= 0) return [];
  const priceExpr = unwrapParens(parts[millionIndex - 1]);
  if (!priceExpr) return [];

  const rows = [];
  const priceRe = new RegExp(`\\?\\s*(${NUMBER_PATTERN})\\s*:`, 'g');
  let match;
  while ((match = priceRe.exec(priceExpr)) !== null) {
    const price = Number(match[1]);
    if (!Number.isFinite(price) || price <= 0) continue;
    rows.push({
      label: deriveVideoPriceLabel(priceExpr.slice(Math.max(0, match.index - 260), match.index), rows.length),
      price,
    });
  }

  const fallbackMatch = priceExpr.match(new RegExp(`:\\s*(${NUMBER_PATTERN})\\s*\\)*$`));
  const fallback = fallbackMatch ? Number(fallbackMatch[1]) : Number(priceExpr);
  if (Number.isFinite(fallback) && fallback > 0) {
    const hasSame = rows.some((row) => Math.abs(row.price - fallback) < 1e-12);
    if (!hasSame || rows.length === 0) {
      rows.push({ label: rows.length === 0 ? 'video' : 'default', price: fallback });
    }
  }

  return rows;
}

function normalizeModelType(model) {
  const category = String(model?.category || '').trim().toLowerCase();
  if (MODEL_TYPE_SET.has(category)) return category;

  const endpoints = Array.isArray(model?.supported_endpoint_types)
    ? model.supported_endpoint_types
    : [];
  const billingType = String(model?.billing_type || model?.billing_mode || '').toLowerCase();
  const name = String(model?.model_name || model?.display_name || '').toLowerCase();

  if (endpoints.includes('openai-video') || parseVideoPricing(model?.billing_expr).length > 0 || /sora|seedance|kling|jimeng|veo|video/.test(name)) return 'video';
  if (endpoints.includes('image-generation') || /dall-e|imagen|flux|cogview|image/.test(name)) return 'image';
  if (endpoints.includes('embeddings') || /embed|embedding/.test(name)) return 'embedding';
  if (endpoints.includes('jina-rerank') || /rerank/.test(name)) return 'rerank';
  if (/whisper|tts|audio|speech|voxtral/.test(name)) return 'audio';
  if (billingType === 'completion' || /babbage|davinci|curie/.test(name)) return 'completion';
  return 'chat';
}

function isPerCallPrice(item) {
  return item?.is_per_call || item?.billing_type === 'per_call';
}

function isTieredExprPrice(item) {
  return item?.is_tiered_expr || item?.billing_type === 'tiered_expr' || item?.billing_mode === 'tiered_expr';
}

export default function Pricing() {
  const { t } = useTranslation();
  const { symbol, rate, code, usdRate } = useCurrency();
  const [models, setModels] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [vendor, setVendor] = useState('');
  const [modelType, setModelType] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedModels, setExpandedModels] = useState(() => new Set());

  useEffect(() => {
    getSiteModels()
      .then((r) => {
        if (r.data.success) {
          setModels(r.data.data || []);
          setVendors(r.data.vendors || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const enabledModels = models.filter((m) => m.enabled !== false);

  // Collect vendor names that actually have models
  const availableVendors = useMemo(() => {
    const vendorNames = new Set(enabledModels.map((m) => m.vendor_name).filter(Boolean));
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
      list = list.filter((m) =>
        (m.display_name || m.model_name || '').toLowerCase().includes(q) ||
        normalizeModelType(m).includes(q) ||
        (Array.isArray(m.channels) && m.channels.some((ch) =>
          (ch.provider_name || ch.provider_slug || '').toLowerCase().includes(q)
        ))
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
  }, [enabledModels, vendor, modelType, search]);

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
    price != null ? `${symbol}${(Number(price) * 1000 * rate).toFixed(4)}` : '-';

  const formatCacheCreationPrice = (modelName, price, price1h) => {
    if (price == null) return '-';
    const supportsDualCacheWindow = (modelName || '').toLowerCase().includes('claude');
    if (supportsDualCacheWindow && price1h != null && Math.abs(Number(price1h) - Number(price)) > 1e-12) {
      return `${t('pricing.cacheCreation5m')} ${formatTokenPrice(price)} / ${t('pricing.cacheCreation1h')} ${formatTokenPrice(price1h)}`;
    }
    return formatTokenPrice(price);
  };

  const formatPerCallPrice = (price) =>
    price != null
      ? `${symbol}${(Number(price) * rate).toFixed(4)}/${t('pricing.perCallUnit')}`
      : '-';

  const formatVideoSecondPrice = (price, item = {}) => {
    const raw = Number(price);
    if (!Number.isFinite(raw)) return '-';
    const multiplier = Number(item.price_multiplier) > 0 ? Number(item.price_multiplier) : 1;
    const sourceCurrency = String(item.price_currency || 'USD').toUpperCase();
    let displayValue = raw * multiplier;
    if (sourceCurrency === 'CNY') {
      displayValue = code === 'CNY' ? displayValue : (displayValue / (usdRate || 1)) * rate;
    } else {
      displayValue *= rate;
    }
    return `${symbol}${displayValue.toFixed(4)}/s`;
  };

  const formatUsdPrice = (price) => {
    if (price == null) return '-';
    const value = Number(price);
    if (!Number.isFinite(value)) return '-';
    const decimals = value >= 1 ? 2 : value >= 0.01 ? 3 : 4;
    return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '')}`;
  };

  const formatOfficialPrice = (official) => {
    if (!official) return '-';
    return `${formatUsdPrice(official.inputPerMtok)} / ${formatUsdPrice(official.outputPerMtok)}`;
  };

  const formatSavings = (model, official) => {
    if (!official || isPerCallPrice(model) || isTieredExprPrice(model)) return null;
    const siteInputPerMtok = Number(model.input_price) * 1000;
    if (!Number.isFinite(siteInputPerMtok) || siteInputPerMtok <= 0 || !official.inputPerMtok) return null;
    const savings = Math.round((siteInputPerMtok / official.inputPerMtok - 1) * 100);
    return savings < 0 ? `${savings}%` : null;
  };

  const getVideoRows = (item) =>
    parseVideoPricing(item?.billing_expr).map((row) => ({
      ...row,
      formatted: formatVideoSecondPrice(row.price, item),
    }));

  const renderPrimaryPrice = (item) => {
    if (isTieredExprPrice(item)) {
      const videoRows = getVideoRows(item);
      if (videoRows.length > 0) {
        return (
          <div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
            {videoRows.map((row) => (
              <span key={`${row.label}-${row.price}`}>{row.label} {row.formatted}</span>
            ))}
          </div>
        );
      }
      return t('pricing.expressionPricing');
    }
    return isPerCallPrice(item) ? t('pricing.perCall') : formatTokenPrice(item.input_price);
  };

  const renderSecondaryPrice = (item, type, modelName) => {
    if (isTieredExprPrice(item)) return '-';
    if (isPerCallPrice(item)) {
      return type === 'output' ? formatPerCallPrice(item.fixed_price) : '-';
    }
    if (type === 'output') return formatTokenPrice(item.output_price);
    if (type === 'cache_read') return formatTokenPrice(item.cache_read_price);
    return formatCacheCreationPrice(modelName || item.model_name, item.cache_creation_price, item.cache_creation_price_1h);
  };

  const getChannelLabel = (channel, index) =>
    channel.provider_name || t('pricing.channelFallback', { number: channel.channel_index || index + 1 });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-heading font-bold text-page mb-3">{t('pricing.title')}</h1>
        <p className="text-page-secondary max-w-xl mx-auto">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Vendor Filter */}
      {availableVendors.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button
            onClick={() => setVendor('')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              !vendor
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'glass-sm text-page-secondary hover:text-page hover:bg-page-surface-hover'
            }`}
          >
            {t('pricing.allVendors')}
          </button>
          {availableVendors.map((v) => (
            <button
              key={v.id}
              onClick={() => setVendor(v.name)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                vendor === v.name
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'glass-sm text-page-secondary hover:text-page hover:bg-page-surface-hover'
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      {/* Model Type Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {MODEL_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value || 'all'}
            onClick={() => setModelType(option.value)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              modelType === option.value
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'glass-sm text-page-secondary hover:text-page hover:bg-page-surface-hover'
            }`}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-page-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-10"
            placeholder={t('pricing.searchPlaceholder')}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-page-secondary">
          {search || vendor || modelType ? t('pricing.noMatch') : t('pricing.noModels')}
        </div>
      ) : (
        <div className="glass-sm rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-page-divider">
                <th className="text-left px-5 py-3.5 font-medium text-page-secondary">{t('pricing.model')}</th>
                <th className="text-right px-5 py-3.5 font-medium text-page-secondary">{t('pricing.inputPrice')}</th>
                <th className="text-right px-5 py-3.5 font-medium text-page-secondary">{t('pricing.outputPrice')}</th>
                <th className="text-right px-5 py-3.5 font-medium text-page-secondary">{t('pricing.cacheReadPrice')}</th>
                <th className="text-right px-5 py-3.5 font-medium text-page-secondary">{t('pricing.cacheCreationPrice')}</th>
                <th className="text-right px-5 py-3.5 font-medium text-page-secondary whitespace-nowrap">{t('pricing.officialPrice')}</th>
                <th className="text-right px-5 py-3.5 font-medium text-page-secondary whitespace-nowrap">{t('pricing.savings')}</th>
                <th className="text-center px-5 py-3.5 font-medium text-page-secondary">{t('pricing.status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const official = getOfficialPrice(m);
                const savings = formatSavings(m, official);
                const channels = Array.isArray(m.channels) ? m.channels : [];
                const modelKey = `${m.model_name || 'model'}-${m.id || i}`;
                const expanded = expandedModels.has(modelKey);
                const canExpand = channels.length > 0;

                return (
                  <React.Fragment key={modelKey}>
                    <tr className="border-b border-page-divider last:border-0 hover:bg-page-surface transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-[220px] items-center gap-2">
                          <button
                            type="button"
                            onClick={() => canExpand && toggleModel(modelKey)}
                            disabled={!canExpand}
                            className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-page-divider transition-colors ${
                              canExpand
                                ? 'text-page-secondary hover:bg-page-surface-hover hover:text-page'
                                : 'cursor-default text-page-muted opacity-40'
                            }`}
                            aria-label={expanded ? t('pricing.collapseChannels') : t('pricing.expandChannels')}
                          >
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <div className="min-w-0">
                            <span className="block truncate font-mono text-page">{m.display_name || m.model_name}</span>
                            {canExpand && (
                              <span className="mt-1 inline-flex rounded-full bg-page-surface px-2 py-0.5 text-[11px] font-medium text-page-secondary">
                                {t('pricing.channelCount', { count: channels.length })}
                              </span>
                            )}
                            <span className="mt-1 inline-flex rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-600">
                              {t(`pricing.type.${normalizeModelType(m)}`)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label">
                        {renderPrimaryPrice(m)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label">
                        {renderSecondaryPrice(m, 'output')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label">
                        {renderSecondaryPrice(m, 'cache_read')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                        {renderSecondaryPrice(m, 'cache_creation')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                        {formatOfficialPrice(official)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {savings ? (
                          <span className={`inline-flex justify-end rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${
                            savings.startsWith('-')
                              ? 'bg-green-500/10 text-page-success'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {savings}
                          </span>
                        ) : (
                          <span className="font-mono text-page-muted">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${
                          m.status === 'healthy'
                            ? 'bg-green-500/10 text-page-success border-green-500/20'
                            : 'bg-page-surface text-page-secondary border-page-divider'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'healthy' ? 'bg-green-500' : 'bg-neutral-500'}`} />
                          {m.status === 'healthy' ? t('pricing.online') : t('pricing.unknown')}
                        </span>
                      </td>
                    </tr>
                    {expanded && canExpand && (
                      <tr className="border-b border-page-divider bg-page-surface">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="overflow-hidden rounded-lg border border-page-divider bg-page-inset">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-page-divider text-page-secondary">
                                  <th className="px-4 py-2.5 text-left font-medium">{t('pricing.channel')}</th>
                                  <th className="px-4 py-2.5 text-right font-medium">{t('pricing.inputPriceShort')}</th>
                                  <th className="px-4 py-2.5 text-right font-medium">{t('pricing.outputPriceShort')}</th>
                                  <th className="px-4 py-2.5 text-right font-medium">{t('pricing.cacheReadShort')}</th>
                                  <th className="px-4 py-2.5 text-right font-medium">{t('pricing.cacheCreationShort')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {channels.map((channel, channelIndex) => {
                                  return (
                                    <tr key={`${modelKey}-channel-${channel.provider_slug || channelIndex}`} className="border-b border-page-divider last:border-0">
                                      <td className="px-4 py-3">
                                        <div className="flex min-w-[220px] items-center gap-2">
                                          {channel.provider_logo ? (
                                            <img
                                              src={channel.provider_logo}
                                              alt=""
                                              className="h-6 w-6 rounded-md object-cover"
                                              loading="lazy"
                                            />
                                          ) : (
                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/10 text-[10px] font-semibold text-brand-600">
                                              {channel.channel_index || channelIndex + 1}
                                            </span>
                                          )}
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              {channel.provider_website ? (
                                                <a
                                                  href={channel.provider_website}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="truncate font-medium text-page hover:text-brand-500"
                                                >
                                                  {getChannelLabel(channel, channelIndex)}
                                                </a>
                                              ) : (
                                                <span className="truncate font-medium text-page">{getChannelLabel(channel, channelIndex)}</span>
                                              )}
                                              {channel.provider_website && <ExternalLink size={11} className="flex-shrink-0 text-page-muted" />}
                                            </div>
                                            {channel.provider_description && (
                                              <p className="mt-0.5 max-w-lg truncate text-[11px] text-page-muted">
                                                {channel.provider_description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-page-label">
                                        {renderPrimaryPrice(channel)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-page-label">
                                        {renderSecondaryPrice(channel, 'output')}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-page-label">
                                        {renderSecondaryPrice(channel, 'cache_read')}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-page-label whitespace-nowrap">
                                        {renderSecondaryPrice(channel, 'cache_creation', m.model_name)}
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
      )}
    </div>
  );
}
