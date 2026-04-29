import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getSiteModels } from '../api';
import { useCurrency } from '../context/SiteContext';

export default function Pricing() {
  const { t } = useTranslation();
  const { symbol, rate } = useCurrency();
  const [models, setModels] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [vendor, setVendor] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

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
        (m.display_name || m.model_name || '').toLowerCase().includes(q)
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
        <>
          {/* ─────────── Desktop / tablet: table view ─────────── */}
          <div className="hidden md:block glass-sm rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-page-divider">
                  <th className="text-left px-5 py-3.5 font-medium text-page-secondary">{t('pricing.model')}</th>
                  <th className="text-right px-5 py-3.5 font-medium text-page-secondary">{t('pricing.inputPrice')}</th>
                  <th className="text-right px-5 py-3.5 font-medium text-page-secondary">{t('pricing.outputPrice')}</th>
                  <th className="text-center px-5 py-3.5 font-medium text-page-secondary">{t('pricing.status')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.model_name || i} className="border-b border-page-divider last:border-0 hover:bg-page-surface transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-page">{m.display_name || m.model_name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-page-label">
                      {m.is_per_call ? t('pricing.perCall') : formatTokenPrice(m.input_price)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-page-label">
                      {m.is_per_call ? formatPerCallPrice(m.fixed_price) : formatTokenPrice(m.output_price)}
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
                ))}
              </tbody>
            </table>
          </div>

          {/* ─────────── Mobile: card list view ─────────── */}
          <div className="md:hidden flex flex-col gap-2.5">
            {filtered.map((m, i) => {
              const healthy = m.status === 'healthy';
              return (
                <div
                  key={m.model_name || i}
                  className="glass-sm rounded-xl px-4 py-3.5"
                >
                  {/* Header row: model name + status */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className="font-mono text-[13px] text-page break-all leading-snug min-w-0 flex-1">
                      {m.display_name || m.model_name}
                    </span>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
                      healthy
                        ? 'bg-green-500/10 text-page-success border-green-500/20'
                        : 'bg-page-surface text-page-secondary border-page-divider'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${healthy ? 'bg-green-500' : 'bg-neutral-500'}`} />
                      {healthy ? t('pricing.online') : t('pricing.unknown')}
                    </span>
                  </div>

                  {/* Price row */}
                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-page-divider">
                    <div>
                      <p className="text-[11px] text-page-muted mb-0.5">{t('pricing.inputPrice')}</p>
                      <p className="font-mono text-[13px] text-page-label">
                        {m.is_per_call ? t('pricing.perCall') : formatTokenPrice(m.input_price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-page-muted mb-0.5">{t('pricing.outputPrice')}</p>
                      <p className="font-mono text-[13px] text-page-label">
                        {m.is_per_call ? formatPerCallPrice(m.fixed_price) : formatTokenPrice(m.output_price)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/40 ring-1 ring-white/20 flex items-center justify-center transition-all duration-300 ${
          showTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
