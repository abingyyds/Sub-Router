import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, Copy, Globe2, Network, RadioTower } from 'lucide-react';
import { SHARED_API_ENDPOINTS } from '../constants/apiEndpoints';
import { useSite } from '../context/SiteContext';

const normalizeEndpoint = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return `https://${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

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

export default function ApiEndpoints() {
  const { t } = useTranslation();
  const { site } = useSite();
  const [copiedId, setCopiedId] = useState('');

  const siteEndpoint = useMemo(() => {
    const currentOrigin =
      typeof window !== 'undefined' ? window.location.origin : '';
    return normalizeEndpoint(site?.domain || currentOrigin);
  }, [site?.domain]);

  const endpoints = useMemo(
    () => [
      {
        id: 'site',
        label: t('home.apiEndpointSite'),
        url: siteEndpoint,
      },
      ...SHARED_API_ENDPOINTS.map((endpoint) => ({
        ...endpoint,
        label: t(endpoint.labelKey),
        apiOnly: true,
      })),
    ].filter((endpoint) => endpoint.url),
    [siteEndpoint, t],
  );

  const handleCopy = async (endpoint) => {
    await copyToClipboard(endpoint.url);
    toast.success(t('config.apiUrlCopied'));
    setCopiedId(endpoint.id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === endpoint.id ? '' : current));
    }, 1600);
  };

  return (
    <section className="api-endpoints-panel mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="api-endpoints-card glass rounded-xl p-4 sm:p-5 lg:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-page">
              {t('home.apiEndpointsTitle')}
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-page-muted">
              {t('home.apiEndpointsDesc')}
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-medium text-page-muted">
            {t('home.apiEndpointClickToCopy')}
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {endpoints.map((endpoint) => (
            <button
              key={endpoint.id}
              type="button"
              onClick={() => handleCopy(endpoint)}
              aria-label={`${t('home.apiEndpointClickToCopy')}: ${endpoint.label}`}
              className="group min-w-0 rounded-lg border border-page-divider bg-page-inset/40 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-page-surface-hover focus-visible:translate-y-0"
            >
              <div className="mb-2 flex min-w-0 items-center gap-2">
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
              <code className="block break-all text-[11px] leading-5 text-page-secondary">
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
  if (endpoint.id === 'site') return <Globe2 className="h-4 w-4" aria-hidden="true" />;
  if (endpoint.id.includes('official')) return <RadioTower className="h-4 w-4" aria-hidden="true" />;
  return <Network className="h-4 w-4" aria-hidden="true" />;
}
