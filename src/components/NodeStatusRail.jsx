import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, X } from 'lucide-react';
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
    text: 'text-amber-600 dark:text-amber-300',
  },
  down: {
    label: 'nodeStatus.down',
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-300',
  },
  unknown: {
    label: 'nodeStatus.unknown',
    dot: 'bg-slate-400',
    text: 'opacity-60',
  },
};

const endpointName = (endpoint, t) => t(endpoint.nameKey, { defaultValue: endpoint.id });

const endpointAddress = (endpoint, node) => {
  const value = String(node?.url || endpoint.url || '').replace(/\/+$/, '');
  return value.endsWith('/v1') ? value : `${value}/v1`;
};

const NodeStatusRail = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const railRef = useRef(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await getNodeStatus('24h');
        if (active && response.data?.success) setData(response.data.data || null);
      } catch {
        // Keep the last successful snapshot and show unknown when there is none.
      } finally {
        if (active) setLoading(false);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, REFRESH_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

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

  return (
    <div ref={railRef} className="fixed bottom-4 right-4 z-40 md:right-5 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
      {expanded && (
        <div role="dialog" aria-label={t('nodeStatus.title')} className="absolute bottom-12 right-0 w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[rgb(var(--page-text)/0.12)] bg-[var(--page-bg)]/95 text-page shadow-2xl backdrop-blur-md md:bottom-auto md:right-12 md:top-1/2 md:-translate-y-1/2">
          <div className="flex items-center justify-between border-b border-[rgb(var(--page-text)/0.1)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Globe2 className="h-4 w-4 shrink-0 text-page-success" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{t('nodeStatus.title')}</h2>
                <p className={`text-[11px] ${overallMeta.text}`}>{t(overallMeta.label)}</p>
              </div>
            </div>
            <button type="button" onClick={() => setExpanded(false)} className="rounded-md p-1.5 opacity-60 transition hover:bg-current/10 hover:opacity-100" aria-label={t('nodeStatus.close')} title={t('nodeStatus.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-2">
            {loading && !data ? (
              <div className="space-y-1.5 p-1" aria-label={t('nodeStatus.loading')}>
                {nodes.map((node) => (
                  <div key={node.id} className="h-14 animate-pulse rounded-lg bg-current/10" />
                ))}
              </div>
            ) : (
              <ul className="space-y-1">
                {nodes.map((node) => {
                  const meta = statusMeta[node.status] || statusMeta.unknown;
                  const availability24h = typeof node.availability_24h === 'number' ? node.availability_24h : node.availability24h;
                  const availability = typeof availability24h === 'number' ? `${availability24h.toFixed(2)}%` : t('nodeStatus.noData');
                  const latency = typeof node.latest_latency_ms === 'number' && node.last_checked_at ? `${node.latest_latency_ms} ms` : t('nodeStatus.noData');
                  const latencyLabel = `${t('nodeStatus.latency')}: ${latency}`;
                  return (
                    <li key={node.id} className="rounded-lg px-2.5 py-2 transition hover:bg-current/[0.06]">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} title={latencyLabel} aria-label={latencyLabel} tabIndex={0} />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{endpointName(node, t)}</span>
                        <span className={`shrink-0 text-[11px] ${meta.text}`}>{t(meta.label)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 pl-[18px] text-[10px] leading-4 opacity-65">
                        <code className="min-w-0 flex-1 truncate" dir="ltr">
                          {endpointAddress(node, node)}
                        </code>
                        <span className="shrink-0">
                          {t('nodeStatus.period24h')} {t('nodeStatus.availability')} {availability}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-[rgb(var(--page-text)/0.1)] px-4 py-2 text-[10px] opacity-55">{t('nodeStatus.source')}</div>
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
