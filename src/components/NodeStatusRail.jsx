import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, Globe2, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getNodeStatus } from '../api';
import { SHARED_API_ENDPOINTS } from '../constants/apiEndpoints';

const REFRESH_INTERVAL = 60 * 1000;

const statusMeta = {
  healthy: {
    label: 'nodeStatus.healthy',
    dot: 'bg-emerald-500',
    text: 'text-page-success',
  },
  degraded: {
    label: 'nodeStatus.degraded',
    dot: 'bg-amber-500',
    text: 'text-page-warning',
  },
  down: {
    label: 'nodeStatus.down',
    dot: 'bg-red-500',
    text: 'text-page-danger',
  },
  unknown: {
    label: 'nodeStatus.unknown',
    dot: 'bg-slate-400',
    text: 'text-page-muted',
  },
};

const copyToClipboard = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  }
};

const endpointAddress = (endpoint, node) => {
  const value = String(node?.url || endpoint.url || '').replace(/\/+$/, '');
  return value.endsWith('/v1') ? value : `${value}/v1`;
};

const NodeStatusRail = () => {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const railRef = useRef(null);
  const isRtl = i18n.dir() === 'rtl';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNodeStatus('24h');
      if (!response.data?.success) throw new Error('node status request failed');
      setData(response.data.data || null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, REFRESH_INTERVAL);
    return () => {
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!expanded) return undefined;
    const handlePointerDown = (event) => {
      if (!railRef.current?.contains(event.target)) setExpanded(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  const nodes = useMemo(
    () =>
      SHARED_API_ENDPOINTS.map((endpoint) => ({
        ...endpoint,
        ...(data?.nodes?.find((node) => node.id === endpoint.id) || {}),
      })),
    [data],
  );

  const overallStatus = useMemo(() => {
    if (!data?.nodes?.length) return 'unknown';
    if (data.nodes.some((node) => node.status === 'down')) return 'down';
    if (data.nodes.some((node) => node.status === 'degraded')) return 'degraded';
    if (data.nodes.every((node) => node.status === 'healthy')) return 'healthy';
    return 'unknown';
  }, [data]);
  const overallMeta = statusMeta[overallStatus];

  const handleCopy = async (nodeId, address) => {
    const copied = await copyToClipboard(address);
    if (!copied) {
      toast.error(t('nodeStatus.copyFailed'));
      return;
    }
    setCopiedId(nodeId);
    toast.success(t('nodeStatus.copied'));
    window.setTimeout(() => {
      setCopiedId((current) => (current === nodeId ? '' : current));
    }, 1600);
  };

  return (
    <div ref={railRef} className="fixed bottom-4 right-4 z-40 md:right-5 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
      {expanded && (
        <div
          role="dialog"
          aria-label={t('nodeStatus.title')}
          className={`absolute bottom-14 right-0 flex max-h-[min(72vh,560px)] w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border border-page-divider bg-[var(--page-bg)]/95 text-page shadow-2xl backdrop-blur-md md:bottom-auto md:top-1/2 md:-translate-y-1/2 ${isRtl ? 'md:left-12 md:right-auto' : 'md:right-12'}`}
        >
          <div className="flex items-center justify-between border-b border-[rgb(var(--page-text)/0.1)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Globe2 className="h-4 w-4 shrink-0 text-page-success" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{t('nodeStatus.title')}</h2>
                <p className={`text-[11px] ${overallMeta.text}`}>{t(overallMeta.label)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={refresh}
                className="rounded-md p-1.5 text-page-muted transition hover:bg-page-surface-hover hover:text-page disabled:cursor-wait disabled:opacity-60"
                aria-label={t('nodeStatus.refresh')}
                title={t('nodeStatus.refresh')}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={() => setExpanded(false)} className="rounded-md p-1.5 text-page-muted transition hover:bg-page-surface-hover hover:text-page" aria-label={t('nodeStatus.close')} title={t('nodeStatus.close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-2">
            {error && (
              <p className="px-2.5 pb-1 text-[11px] text-page-warning" role="status">
                {t('nodeStatus.refreshFailed')}
              </p>
            )}
            {loading && !data ? (
              <div className="space-y-1.5 p-1" aria-label={t('nodeStatus.loading')}>
                {nodes.map((node) => (
                  <div key={node.id} className="h-[4.75rem] animate-pulse rounded-lg bg-page-surface" />
                ))}
              </div>
            ) : (
              <ul className="space-y-1">
                {nodes.map((node) => {
                  const meta = statusMeta[node.status] || statusMeta.unknown;
                  const nodeName = t(`nodeStatus.nodes.${node.id}.name`, { defaultValue: node.name || node.id });
                  const nodeDescription = t(`nodeStatus.nodes.${node.id}.description`, { defaultValue: node.description || '' });
                  const availability24h = typeof node.availability_24h === 'number' ? node.availability_24h : node.availability24h;
                  const availability = typeof availability24h === 'number' ? `${availability24h.toFixed(2)}%` : t('nodeStatus.noData');
                  const latency = typeof node.latest_latency_ms === 'number' && node.last_checked_at ? `${node.latest_latency_ms} ms` : t('nodeStatus.noData');
                  const latencyLabel = `${t('nodeStatus.latency')}: ${latency}`;
                  const address = endpointAddress(node, node);
                  return (
                    <li key={node.id} className="rounded-lg border border-transparent px-2.5 py-2 transition hover:border-page-divider hover:bg-page-surface">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} title={latencyLabel} aria-label={latencyLabel} tabIndex={0} />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold" title={nodeDescription}>{nodeName}</span>
                        <span className={`shrink-0 text-[11px] ${meta.text}`}>{t(meta.label)}</span>
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 pl-[18px] text-[10px] leading-4 text-page-muted">
                        <code className="min-w-0 flex-1 truncate" dir="ltr">
                          {address}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(node.id, address)}
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-page-muted transition hover:bg-page-surface-hover hover:text-page-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-page-link/40"
                          aria-label={`${t('nodeStatus.copyAddress')}: ${address}`}
                          title={copiedId === node.id ? t('nodeStatus.copied') : t('nodeStatus.copyAddress')}
                        >
                          {copiedId === node.id ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 pl-[18px] text-[10px] leading-4 text-page-muted">
                        <span>{t('nodeStatus.period24h')} {t('nodeStatus.availability')} <strong className="font-semibold text-page-secondary">{availability}</strong></span>
                        <span title={latencyLabel}>{t('nodeStatus.latency')} <strong className="font-semibold text-page-secondary">{latency}</strong></span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-[rgb(var(--page-text)/0.1)] px-4 py-2 text-[10px] text-page-muted">{t('nodeStatus.source')} · {t('nodeStatus.refreshCadence')}</div>
        </div>
      )}

      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex items-center gap-2 rounded-full border border-[rgb(var(--page-text)/0.14)] bg-[var(--page-bg)]/95 px-3 py-2 text-page shadow-lg backdrop-blur transition hover:border-emerald-400/60 md:rounded-l-xl md:rounded-r-none md:px-2 md:py-3" aria-expanded={expanded} aria-label={t('nodeStatus.title')} title={t('nodeStatus.title')}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${overallMeta.dot}`} aria-hidden="true" />
        <span className="max-w-[11rem] truncate text-xs font-semibold md:max-w-none md:[writing-mode:vertical-rl]">{t('nodeStatus.title')}</span>
      </button>
    </div>
  );
};

export default NodeStatusRail;
