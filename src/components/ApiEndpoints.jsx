import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSite } from '../context/SiteContext';

const SHARED_API_ENDPOINTS = [
  {
    id: 'overseas-direct',
    labelKey: 'home.apiEndpointOverseasDirect',
    url: 'https://aiapi.up.railway.app',
  },
  {
    id: 'overseas-cdn',
    labelKey: 'home.apiEndpointOverseasCdn',
    url: 'https://ai.orbitlink.me',
  },
];

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

  const handleCopy = async (url) => {
    await copyToClipboard(url);
    toast.success(t('config.apiUrlCopied'));
  };

  return (
    <section className="max-w-5xl mx-auto px-6 pb-12">
      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-page">
              {t('home.apiEndpointsTitle')}
            </p>
            <p className="mt-1 text-xs text-page-muted">
              {t('home.apiEndpointsDesc')}
            </p>
          </div>
          <span className="text-[11px] text-page-muted">
            {t('home.apiEndpointClickToCopy')}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {endpoints.map((endpoint) => (
            <button
              key={endpoint.id}
              type="button"
              onClick={() => handleCopy(endpoint.url)}
              className="rounded-xl border border-page-divider bg-page-inset/40 px-4 py-3 text-left transition-colors hover:bg-page-surface-hover"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-page-label">
                  {endpoint.label}
                </span>
                {endpoint.apiOnly && (
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-400">
                    {t('home.apiEndpointApiOnly')}
                  </span>
                )}
              </div>
              <code className="block break-all text-[11px] leading-relaxed text-page-secondary">
                {endpoint.url}
              </code>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
