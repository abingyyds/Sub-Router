import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { getSiteModels } from '../api';
import { useCurrency } from '../context/SiteContext';
import { getOfficialPrice } from '../utils/officialEquiv';

export default function Pricing() {
  const { t } = useTranslation();
  const { symbol, rate } = useCurrency();
  const [models, setModels] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [vendor, setVendor] = useState('');
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
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        (m.display_name || m.model_name || '').toLowerCase().includes(q) ||
        (Array.isArray(m.channels) && m.channels.some((ch) =>
          (ch.provider_name || ch.provider_slug || '').toLowerCase().includes(q)
        ))
      );
    }
    list = [...list].sort((a, b) => {
      if (!!a.is_per_call !== !!b.is_per_call) {
        return a.is_per_call ? 1 : -1;
      }
      if (a.is_per_call) {
        return (Number(a.fixed_price) || 0) - (Number(b.fixed_price) || 0);
      }
      return (Number(a.input_price) || 0) - (Number(b.input_price) || 0);
    });
    return list;
  }, [enabledModels, vendor, search]);

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
    if (!official || isPerCallPrice(model)) return null;
    const siteInputPerMtok = Number(model.input_price) * 1000;
    if (!Number.isFinite(siteInputPerMtok) || siteInputPerMtok <= 0 || !official.inputPerMtok) return null;
    const savings = Math.round((siteInputPerMtok / official.inputPerMtok - 1) * 100);
    return savings < 0 ? `${savings}%` : null;
  };

  const isPerCallPrice = (item) => item?.is_per_call || item?.billing_type === 'per_call';

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
          {search || vendor ? t('pricing.noMatch') : t('pricing.noModels')}
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
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label">
                        {isPerCallPrice(m) ? t('pricing.perCall') : formatTokenPrice(m.input_price)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label">
                        {isPerCallPrice(m) ? formatPerCallPrice(m.fixed_price) : formatTokenPrice(m.output_price)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label">
                        {isPerCallPrice(m) ? '-' : formatTokenPrice(m.cache_read_price)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                        {isPerCallPrice(m) ? '-' : formatCacheCreationPrice(m.model_name, m.cache_creation_price, m.cache_creation_price_1h)}
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
                                  const channelIsPerCall = isPerCallPrice(channel);
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
                                        {channelIsPerCall ? t('pricing.perCall') : formatTokenPrice(channel.input_price)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-page-label">
                                        {channelIsPerCall ? formatPerCallPrice(channel.fixed_price) : formatTokenPrice(channel.output_price)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-page-label">
                                        {channelIsPerCall ? '-' : formatTokenPrice(channel.cache_read_price)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-page-label whitespace-nowrap">
                                        {channelIsPerCall ? '-' : formatCacheCreationPrice(m.model_name, channel.cache_creation_price, channel.cache_creation_price_1h)}
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
