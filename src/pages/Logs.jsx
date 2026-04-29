import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getUserLogs, Q } from '../api';
import { useCurrency } from '../context/SiteContext';

function formatTime(unix) {
  if (!unix) return '-';
  const d = new Date(unix * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getLogOther(otherStr) {
  if (!otherStr) return null;
  try {
    return JSON.parse(otherStr);
  } catch (e) {
    return null;
  }
}

function formatAmount(symbol, rate, amount) {
  return `${symbol}${(Number(amount || 0) * rate).toFixed(6)}`;
}

function getProviderSummary(other) {
  if (!other?.provider_name) return '';
  if (other.provider_description) {
    return `${other.provider_name}：${other.provider_description}`;
  }
  return other.provider_name;
}

function getBillingSourceLabel(other, t) {
  if (!other?.billing_source) return '';
  if (other.billing_source === 'subscription') {
    if (other.subscription_source === 'dist_package') return t('dashboard.packages');
    if (other.subscription_source === 'order') return t('主站订阅');
    if (other.subscription_source === 'admin') return t('后台订阅');
    return t('订阅');
  }
  if (other.billing_source === 'wallet') {
    return t('钱包');
  }
  return '';
}

function getSitePricingDetails(other, symbol, rate, t) {
  if (!other?.site_billing_mode) return [];

  if (other.site_billing_mode === 'per_call') {
    return [
      { key: t('定价方式'), value: t('按次计费') },
      { key: t('价格'), value: formatAmount(symbol, rate, other.site_fixed_price) },
    ];
  }

  const details = [{ key: t('定价方式'), value: t('按量计费') }];
  if (Number(other.site_input_price || 0) > 0) {
    details.push({
      key: t('输入价格'),
      value: `${formatAmount(symbol, rate, other.site_input_price)} / 1M tokens`,
    });
  }
  if (Number(other.site_output_price || 0) > 0) {
    details.push({
      key: t('输出价格'),
      value: `${formatAmount(symbol, rate, other.site_output_price)} / 1M tokens`,
    });
  }
  if (Number(other.site_cache_read_price || 0) > 0) {
    details.push({
      key: t('缓存读取价格'),
      value: `${formatAmount(symbol, rate, other.site_cache_read_price)} / 1M tokens`,
    });
  }

  const cacheCreate5m = Number(other.site_cache_creation_price_5m || 0);
  const cacheCreate1h = Number(other.site_cache_creation_price_1h || 0);
  const cacheCreate = Number(other.site_cache_creation_price || 0);
  if (cacheCreate5m > 0 || cacheCreate1h > 0) {
    const parts = [];
    if (cacheCreate5m > 0) {
      parts.push(`5m ${formatAmount(symbol, rate, cacheCreate5m)} / 1M tokens`);
    }
    if (cacheCreate1h > 0) {
      parts.push(`1h ${formatAmount(symbol, rate, cacheCreate1h)} / 1M tokens`);
    }
    details.push({
      key: t('缓存创建价格'),
      value: parts.join(' / '),
    });
  } else if (cacheCreate > 0) {
    details.push({
      key: t('缓存创建价格'),
      value: `${formatAmount(symbol, rate, cacheCreate)} / 1M tokens`,
    });
  }

  return details;
}

export default function Logs() {
  const { t } = useTranslation();
  const { symbol, rate } = useCurrency();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState('');
  const [tokenFilter, setTokenFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { p: page, page_size: pageSize, type: 2 }; // type=2 consume only
      if (modelFilter) params.model_name = modelFilter;
      if (tokenFilter) params.token_name = tokenFilter;
      const res = await getUserLogs(params);
      if (res.data.success) {
        setLogs(res.data.data?.items || []);
        setTotal(res.data.data?.total || 0);
      }
    } catch (e) { /* interceptor */ }
    setLoading(false);
  }, [page, modelFilter, tokenFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleRow = (logId) => {
    setExpandedRows(prev => ({ ...prev, [logId]: !prev[logId] }));
  };

  const getExpandData = useCallback((log) => {
    const other = getLogOther(log.other);
    if (!other) return [];

    const data = [];
    const billingSourceLabel = getBillingSourceLabel(other, t);

    const providerSummary = getProviderSummary(other);
    if (providerSummary) {
      data.push({ key: t('供应商'), value: providerSummary });
    }

    if (billingSourceLabel) {
      data.push({ key: t('实际扣费来源'), value: billingSourceLabel });
    }

    data.push(...getSitePricingDetails(other, symbol, rate, t));

    if (other.cache_tokens > 0) {
      data.push({ key: t('缓存命中 Tokens'), value: Number(other.cache_tokens).toLocaleString() });
    }
    if (other.cache_creation_tokens > 0) {
      data.push({ key: t('缓存创建 Tokens'), value: Number(other.cache_creation_tokens).toLocaleString() });
    }
    if (other.cache_creation_tokens_5m > 0) {
      data.push({ key: t('缓存创建 Tokens (5m)'), value: Number(other.cache_creation_tokens_5m).toLocaleString() });
    }
    if (other.cache_creation_tokens_1h > 0) {
      data.push({ key: t('缓存创建 Tokens (1h)'), value: Number(other.cache_creation_tokens_1h).toLocaleString() });
    }

    // Request ID
    if (log.request_id) {
      data.push({ key: 'Request ID', value: log.request_id });
    }

    // Stream info
    if (log.is_stream !== undefined) {
      data.push({ key: t('流式'), value: log.is_stream ? t('是') : t('否') });
    }

    // First response time for streaming
    if (log.is_stream && other.frt) {
      const frtSeconds = (parseFloat(other.frt) / 1000.0).toFixed(1);
      data.push({ key: t('首字时间'), value: `${frtSeconds}s` });
    }

    return data;
  }, [rate, symbol, t]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-page mb-1">{t('logs.title')}</h1>
        <p className="text-sm text-page-secondary">{t('logs.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px]">
            <input
              type="text"
              value={modelFilter}
              onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
              className="input w-full"
              placeholder={t('logs.filterModel')}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <input
              type="text"
              value={tokenFilter}
              onChange={(e) => { setTokenFilter(e.target.value); setPage(1); }}
              className="input w-full"
              placeholder={t('logs.filterToken')}
            />
          </div>
          <button onClick={() => { setModelFilter(''); setTokenFilter(''); setPage(1); }} className="btn-secondary text-sm">
            {t('logs.clearFilter')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-page-secondary">
            <p>{t('logs.noLogs')}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-page-divider">
                    <th className="w-8"></th>
                    <th className="text-left px-4 py-3 font-medium text-page-secondary">{t('logs.time')}</th>
                    <th className="text-left px-4 py-3 font-medium text-page-secondary">{t('logs.model')}</th>
                    <th className="text-left px-4 py-3 font-medium text-page-secondary">{t('logs.token')}</th>
                    <th className="text-right px-4 py-3 font-medium text-page-secondary">{t('logs.promptTokens')}</th>
                    <th className="text-right px-4 py-3 font-medium text-page-secondary">{t('logs.completionTokens')}</th>
                    <th className="text-right px-4 py-3 font-medium text-page-secondary">{t('logs.cost')}</th>
                    <th className="text-right px-4 py-3 font-medium text-page-secondary">{t('logs.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const expandData = getExpandData(log);
                    const hasExpandData = expandData.length > 0;
                    const isExpanded = expandedRows[log.id];
                    const billingSourceLabel = getBillingSourceLabel(getLogOther(log.other), t);
                    return (
                      <React.Fragment key={i}>
                        <tr
                          className={`border-b border-page-divider last:border-0 hover:bg-page-surface transition-colors ${hasExpandData ? 'cursor-pointer' : ''}`}
                          onClick={() => hasExpandData && toggleRow(log.id)}
                        >
                          <td className="px-2 py-3 text-page-secondary">
                            {hasExpandData && (
                              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-page-secondary text-xs whitespace-nowrap">{formatTime(log.created_at)}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-page">{log.model_name || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-page-secondary">{log.token_name || '-'}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-page-label">{log.prompt_tokens?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-page-label">{log.completion_tokens?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-xs text-page-warning">
                                {log.quota > 0 ? `${symbol}${(log.quota / Q * rate).toFixed(6)}` : '-'}
                              </span>
                              {billingSourceLabel && (
                                <span className="text-[10px] text-page-secondary mt-1">
                                  {billingSourceLabel}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-page-secondary">
                            {log.use_time > 0 ? `${log.use_time}s` : '-'}
                          </td>
                        </tr>
                        {isExpanded && hasExpandData && (
                          <tr className="border-b border-page-divider last:border-0 bg-page-surface/50">
                            <td colSpan="8" className="px-4 py-3">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                                {expandData.map((item, idx) => (
                                  <div key={idx} className="flex flex-col">
                                    <span className="text-page-secondary text-xs">{item.key}</span>
                                    <span className="font-medium text-page">{item.value}</span>
                                  </div>
                                ))}
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-page-divider">
              {logs.map((log, i) => {
                const expandData = getExpandData(log);
                const hasExpandData = expandData.length > 0;
                const isExpanded = expandedRows[log.id];
                const billingSourceLabel = getBillingSourceLabel(getLogOther(log.other), t);
                return (
                  <div key={i} className="px-4 py-3 space-y-1.5">
                    <div
                      className={`flex items-center justify-between ${hasExpandData ? 'cursor-pointer' : ''}`}
                      onClick={() => hasExpandData && toggleRow(log.id)}
                    >
                      <div className="flex items-center gap-2">
                        {hasExpandData && (
                          isExpanded ? <ChevronDown className="w-4 h-4 text-page-secondary" /> : <ChevronRight className="w-4 h-4 text-page-secondary" />
                        )}
                        <span className="font-mono text-xs text-page font-medium">{log.model_name || '-'}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-xs text-page-warning">
                          {log.quota > 0 ? `${symbol}${(log.quota / Q * rate).toFixed(6)}` : '-'}
                        </span>
                        {billingSourceLabel && (
                          <span className="text-[10px] text-page-secondary mt-1">
                            {billingSourceLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-page-secondary">
                      <span>{formatTime(log.created_at)}</span>
                      <span>{log.prompt_tokens || 0} / {log.completion_tokens || 0} tokens</span>
                    </div>
                    {log.token_name && (
                      <div className="text-[11px] text-page-muted">{log.token_name}</div>
                    )}
                    {isExpanded && hasExpandData && (
                      <div className="mt-3 pt-3 border-t border-page-divider/50 grid grid-cols-2 gap-x-4 gap-y-2">
                        {expandData.map((item, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="text-page-secondary text-[10px]">{item.key}</span>
                            <span className="font-medium text-page text-xs">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-page-secondary">
            {t('logs.showing', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-30"
            >
              {t('logs.prev')}
            </button>
            <span className="text-sm text-page-secondary px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-30"
            >
              {t('logs.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
