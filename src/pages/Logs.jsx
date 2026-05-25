import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { getUserLogs, getUserLogsStat, Q } from '../api';
import { useCurrency } from '../context/SiteContext';
import LogSubnav from '../components/LogSubnav';

function formatTime(unix) {
  if (!unix) return '-';
  const d = new Date(unix * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDatetimeLocal(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.floor(parsed / 1000);
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
  const value = Number(amount || 0) * rate;
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: 6,
  })}`;
}

function formatQuotaAmount(symbol, rate, quota, emptyZero = true) {
  const value = (Number(quota || 0) / Q) * rate;
  if (value <= 0 && emptyZero) return '-';
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: 6,
  })}`;
}

function formatTokens(value) {
  return Number(value || 0).toLocaleString();
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

function getLogTypeLabel(type, t) {
  const labels = {
    1: t('logs.typeTopup'),
    2: t('logs.typeConsume'),
    3: t('logs.typeManage'),
    4: t('logs.typeSystem'),
    5: t('logs.typeError'),
    6: t('logs.typeRefund'),
  };
  return labels[type] || t('logs.typeUnknown');
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
  const [loadingStat, setLoadingStat] = useState(true);
  const [stat, setStat] = useState({ quota: 0, rpm: 0, tpm: 0, token: 0 });
  const [modelFilter, setModelFilter] = useState('');
  const [tokenFilter, setTokenFilter] = useState('');
  const [requestIdFilter, setRequestIdFilter] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [logType, setLogType] = useState('2');
  const [appliedFilters, setAppliedFilters] = useState({ type: '2' });
  const [expandedRows, setExpandedRows] = useState({});
  const pageSize = 20;

  const getAppliedParams = useCallback(() => {
    const params = { type: appliedFilters.type || '2' };
    if (appliedFilters.model_name) params.model_name = appliedFilters.model_name;
    if (appliedFilters.token_name) params.token_name = appliedFilters.token_name;
    if (appliedFilters.request_id) params.request_id = appliedFilters.request_id;
    if (appliedFilters.start_timestamp) params.start_timestamp = appliedFilters.start_timestamp;
    if (appliedFilters.end_timestamp) params.end_timestamp = appliedFilters.end_timestamp;
    return params;
  }, [appliedFilters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { p: page, page_size: pageSize, ...getAppliedParams() };
      const res = await getUserLogs(params);
      if (res.data.success) {
        setLogs(res.data.data?.items || []);
        setTotal(res.data.data?.total || 0);
      }
    } catch (e) { /* interceptor */ }
    setLoading(false);
  }, [getAppliedParams, page]);

  const loadStat = useCallback(async () => {
    setLoadingStat(true);
    try {
      const res = await getUserLogsStat(getAppliedParams());
      if (res.data.success) {
        setStat(res.data.data || { quota: 0, rpm: 0, tpm: 0, token: 0 });
      }
    } catch (e) { /* interceptor */ }
    setLoadingStat(false);
  }, [getAppliedParams]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStat(); }, [loadStat]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyFilters = useCallback(() => {
    setExpandedRows({});
    setPage(1);
    setAppliedFilters({
      type: logType,
      model_name: modelFilter.trim(),
      token_name: tokenFilter.trim(),
      request_id: requestIdFilter.trim(),
      start_timestamp: parseDatetimeLocal(startTime),
      end_timestamp: parseDatetimeLocal(endTime),
    });
  }, [endTime, logType, modelFilter, requestIdFilter, startTime, tokenFilter]);

  const resetFilters = useCallback(() => {
    setModelFilter('');
    setTokenFilter('');
    setRequestIdFilter('');
    setStartTime('');
    setEndTime('');
    setLogType('2');
    setExpandedRows({});
    setPage(1);
    setAppliedFilters({ type: '2' });
  }, []);

  const setQuickRange = useCallback((days) => {
    const now = new Date();
    const start = new Date(now);
    if (days === 0) {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - days);
    }
    setStartTime(formatDateTimeLocal(start));
    setEndTime(formatDateTimeLocal(now));
  }, []);

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

    if (log.content) {
      data.push({ key: t('logs.content'), value: log.content });
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
      <LogSubnav active="logs" />

      {/* Filters */}
      <form
        className="glass rounded-2xl p-4 mb-6"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input w-full"
            aria-label={t('logs.startTime')}
            title={t('logs.startTime')}
          />
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input w-full"
            aria-label={t('logs.endTime')}
            title={t('logs.endTime')}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-page-muted" />
            <input
              type="text"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="input w-full pl-10"
              placeholder={t('logs.filterModel')}
            />
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-page-muted" />
            <input
              type="text"
              value={tokenFilter}
              onChange={(e) => setTokenFilter(e.target.value)}
              className="input w-full pl-10"
              placeholder={t('logs.filterToken')}
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={logType}
            onChange={(e) => setLogType(e.target.value)}
            className="input input-solid w-full"
            aria-label={t('logs.type')}
          >
            <option value="0">{t('logs.typeAll')}</option>
            <option value="2">{t('logs.typeConsume')}</option>
            <option value="5">{t('logs.typeError')}</option>
            <option value="1">{t('logs.typeTopup')}</option>
            <option value="6">{t('logs.typeRefund')}</option>
            <option value="3">{t('logs.typeManage')}</option>
            <option value="4">{t('logs.typeSystem')}</option>
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-page-muted" />
            <input
              type="text"
              value={requestIdFilter}
              onChange={(e) => setRequestIdFilter(e.target.value)}
              className="input w-full pl-10"
              placeholder={t('logs.filterRequestId')}
            />
          </div>
          <div className="flex gap-2 lg:col-span-2">
            <button type="button" onClick={() => setQuickRange(0)} className="btn-secondary flex-1 px-3 text-xs">
              {t('logs.today')}
            </button>
            <button type="button" onClick={() => setQuickRange(7)} className="btn-secondary flex-1 px-3 text-xs">
              {t('logs.last7Days')}
            </button>
            <button type="button" onClick={() => setQuickRange(30)} className="btn-secondary flex-1 px-3 text-xs">
              {t('logs.last30Days')}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="submit" className="btn-primary inline-flex items-center gap-2 text-sm" disabled={loading}>
            <Search className="h-4 w-4" />
            {t('logs.search')}
          </button>
          <button type="button" onClick={resetFilters} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <RotateCcw className="h-4 w-4" />
            {t('logs.clearFilter')}
          </button>
        </div>
      </form>

      <div className="glass rounded-2xl p-3 mb-6 flex flex-wrap gap-2">
        {loadingStat ? (
          <>
            <div className="h-8 w-32 rounded-lg bg-page-surface animate-pulse" />
            <div className="h-8 w-24 rounded-lg bg-page-surface animate-pulse" />
            <div className="h-8 w-24 rounded-lg bg-page-surface animate-pulse" />
            <div className="h-8 w-32 rounded-lg bg-page-surface animate-pulse" />
          </>
        ) : (
          <>
            <span className="rounded-lg border border-page-divider bg-page-surface px-3 py-1.5 text-sm font-medium text-page">
              {t('logs.totalCost')}: {formatQuotaAmount(symbol, rate, stat.quota, false)}
            </span>
            <span className="rounded-lg border border-page-divider bg-page-surface px-3 py-1.5 text-sm font-medium text-page">
              RPM: {formatTokens(stat.rpm)}
            </span>
            <span className="rounded-lg border border-page-divider bg-page-surface px-3 py-1.5 text-sm font-medium text-page">
              TPM: {formatTokens(stat.tpm)}
            </span>
            <span className="rounded-lg border border-page-divider bg-page-surface px-3 py-1.5 text-sm font-medium text-page">
              {t('logs.totalTokens')}: {formatTokens(stat.token)}
            </span>
          </>
        )}
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
                    <th className="text-left px-4 py-3 font-medium text-page-secondary">{t('logs.type')}</th>
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
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full border border-page-divider px-2 py-0.5 text-[11px] text-page-secondary">
                              {getLogTypeLabel(log.type, t)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-page-label">{log.prompt_tokens?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-page-label">{log.completion_tokens?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-xs text-page-warning">
                                {formatQuotaAmount(symbol, rate, log.quota)}
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
                            <td colSpan="9" className="px-4 py-3">
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
                        <span className="rounded-full border border-page-divider px-2 py-0.5 text-[10px] text-page-secondary">
                          {getLogTypeLabel(log.type, t)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-xs text-page-warning">
                          {formatQuotaAmount(symbol, rate, log.quota)}
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
