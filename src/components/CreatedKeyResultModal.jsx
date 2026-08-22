import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Copy, Globe2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSite } from '../context/SiteContext';

const normalizeOrigin = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  return `https://${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

const copyToClipboard = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  }
};

export default function CreatedKeyResultModal({ createdKey, onClose }) {
  const { t } = useTranslation();
  const { site } = useSite();
  const [copiedTarget, setCopiedTarget] = useState('');

  const siteOrigin = useMemo(() => {
    const configuredDomain = String(site?.domain || '').trim();
    if (configuredDomain) return normalizeOrigin(configuredDomain);
    return normalizeOrigin(
      typeof window !== 'undefined' ? window.location.origin : '',
    );
  }, [site?.domain]);
  const apiEndpoint = siteOrigin ? `${siteOrigin}/v1` : '';
  const allCredentials = `API Key: ${createdKey}\nBase URL: ${apiEndpoint}`;

  useEffect(() => {
    if (!copiedTarget) return undefined;
    const timeout = window.setTimeout(() => setCopiedTarget(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedTarget]);

  if (!createdKey) return null;

  const handleCopy = async (value, target) => {
    if (!value) return;
    const copied = await copyToClipboard(value);
    if (!copied) {
      toast.error(t('officialChannels.copyFailed'));
      return;
    }
    setCopiedTarget(target);
    toast.success(t(target === 'endpoint' ? 'config.apiUrlCopied' : 'tokens.copiedToClipboard'));
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-page-divider shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="created-key-result-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-page-divider bg-emerald-500/[0.06] px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                {t('tokens.createSuccess')}
              </p>
              <h2 id="created-key-result-title" className="mt-1 text-xl font-bold text-page">
                {t('tokens.newApiKey')}
              </h2>
              <p className="mt-1 text-sm leading-5 text-page-secondary">
                {t('tokens.newKeyEndpointHint')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-page-muted transition hover:bg-page-surface-hover hover:text-page"
            aria-label={t('tokens.cancel')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
            <p className="text-sm leading-5 text-page-warning">{t('tokens.keyWarning')}</p>
          </div>

          <div className="mt-4 rounded-xl border border-page-divider bg-page-inset/60 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-page-muted">
                {t('tokens.newApiKey')}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(createdKey, 'key')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-page-divider bg-page-surface px-3 py-1.5 text-xs font-semibold text-page-secondary transition hover:border-brand-500/40 hover:text-page"
              >
                {copiedTarget === 'key' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedTarget === 'key' ? t('tokens.copied') : t('tokens.copy')}
              </button>
            </div>
            <code className="block max-h-28 overflow-y-auto break-all rounded-lg bg-page-surface px-3 py-3 font-mono text-sm leading-6 text-page-success">
              {createdKey}
            </code>
          </div>

          {apiEndpoint && (
            <div className="mt-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.06] p-4">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <div>
                    <p className="text-sm font-semibold text-page">{t('home.apiEndpointSite')}</p>
                    <p className="mt-0.5 text-xs text-page-muted">{t('home.apiEndpointClickToCopy')}</p>
                  </div>
                </div>
                <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[10px] font-semibold text-brand-500">
                  OpenAI Compatible
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-page-inset px-3 py-2.5">
                <code className="min-w-0 flex-1 break-all text-xs leading-5 text-page">{apiEndpoint}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(apiEndpoint, 'endpoint')}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-page-divider bg-page-surface px-3 py-1.5 text-xs font-semibold text-page-secondary transition hover:border-brand-500/40 hover:text-page"
                >
                  {copiedTarget === 'endpoint' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedTarget === 'endpoint' ? t('tokens.copied') : t('tokens.copy')}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleCopy(allCredentials, 'all')}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-page-divider bg-page-surface px-4 py-3 text-sm font-semibold text-page transition hover:border-brand-500/40 hover:bg-page-surface-hover"
          >
            {copiedTarget === 'all' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copiedTarget === 'all' ? t('tokens.copied') : t('tokens.copyKeyAndEndpoint')}
          </button>
        </div>

        <div className="flex justify-end border-t border-page-divider bg-page-surface/40 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="btn-primary">
            {t('tokens.savedKey')}
          </button>
        </div>
      </div>
    </div>
  );
}
