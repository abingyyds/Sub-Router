import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, Copy, Network, RadioTower } from 'lucide-react';
import { SHARED_API_ENDPOINTS } from '../constants/apiEndpoints';

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

export default function ApiEndpoints({ variant = 'default' }) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState('');

  const endpoints = useMemo(() => {
    return SHARED_API_ENDPOINTS.map((endpoint) => ({
      ...endpoint,
      label: t(endpoint.labelKey),
      apiOnly: true,
    })).filter((endpoint) => endpoint.url);
  }, [t]);

  const handleCopy = async (endpoint) => {
    await copyToClipboard(endpoint.url);
    toast.success(t('config.apiUrlCopied'));
    setCopiedId(endpoint.id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === endpoint.id ? '' : current));
    }, 1600);
  };

  return (
    <section className={`api-endpoints-panel api-endpoints-panel--${variant} mx-auto max-w-7xl px-4 pb-10 sm:px-6`}>
      <div className="api-endpoints-card glass rounded-xl p-3.5 sm:p-4 lg:p-5">
        <div className="api-endpoints-heading mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-base font-bold text-page">
              {t('home.apiEndpointsTitle')}
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-page-muted">
              {t('home.apiEndpointsDesc')}
            </p>
          </div>
          <span className="api-endpoints-copy-hint shrink-0 text-[11px] font-medium text-page-muted">
            {t('home.apiEndpointClickToCopy')}
          </span>
        </div>

        <div className="api-endpoints-grid grid auto-rows-fr gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {endpoints.map((endpoint, index) => (
            <button
              key={endpoint.id}
              type="button"
              onClick={() => handleCopy(endpoint)}
              aria-label={`${t('home.apiEndpointClickToCopy')}: ${endpoint.label}`}
              className="api-endpoint-item group flex h-full min-w-0 flex-col justify-between rounded-lg border border-page-divider bg-page-inset/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-page-surface-hover focus-visible:translate-y-0"
            >
              <div className="api-endpoint-item-top flex min-w-0 items-center gap-2">
                <span className="api-endpoint-index shrink-0 font-mono text-[10px] font-bold text-page-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="api-endpoint-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-page-divider bg-page-surface text-page-link">
                  <EndpointIcon endpoint={endpoint} />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-page-label">{endpoint.label}</span>
                {endpoint.apiOnly && (
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-page-link">
                    {t('home.apiEndpointApiOnly')}
                  </span>
                )}
                <span title={t('home.apiEndpointClickToCopy')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-page-muted transition-colors group-hover:bg-page-surface group-hover:text-page-link">
                  {copiedId === endpoint.id ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                </span>
              </div>
              <code className="api-endpoint-url mt-2 block break-all text-[11px] leading-5 text-page-secondary">
                {endpoint.url}
              </code>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function EndpointIcon({ endpoint }) {
  if (endpoint.id.includes('official')) return <RadioTower className="h-4 w-4" aria-hidden="true" />;
  return <Network className="h-4 w-4" aria-hidden="true" />;
}
