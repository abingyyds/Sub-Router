import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, MonitorDown, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { DOWNLOAD_TOOLS } from '../constants/downloads';

const iconMap = {
  'cc-switch': Sparkles,
  codex: MonitorDown,
  'cherry-studio': PackageCheck,
  nodejs: Download,
};

export default function DownloadCatalog() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.resolvedLanguage?.startsWith('zh');

  return (
    <section className="space-y-6">
      <div className="glass rounded-xl p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('downloads.badge')}
        </div>
        <h2 className="text-2xl font-black tracking-tight text-page md:text-3xl">
          {t('downloads.title')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-page-secondary">
          {t('downloads.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {DOWNLOAD_TOOLS.map((tool) => {
          const Icon = iconMap[tool.id] || Download;
          const metaLinks = [
            tool.officialRepo ? { label: t('downloads.officialRepo'), href: tool.officialRepo } : null,
            tool.installGuide ? { label: t('downloads.installGuide'), href: tool.installGuide } : null,
            tool.providerDocs ? { label: t('downloads.providerDocs'), href: tool.providerDocs } : null,
            tool.releases ? { label: t('downloads.releases'), href: tool.releases } : null,
          ].filter(Boolean);

          return (
            <article key={tool.id} className="glass rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-page">{tool.title}</h3>
                    <span className="rounded-full bg-page-inset/70 px-2 py-0.5 text-xs text-page-muted">
                      {tool.version}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-page-secondary">
                    {isZh ? tool.descZh : tool.descEn}
                  </p>
                </div>
              </div>

              {metaLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {metaLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-page-divider px-3 py-2 text-sm font-medium text-page-secondary transition-colors hover:bg-page-surface-hover hover:text-page"
                    >
                      {link.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {tool.groups.map((group) => (
                  <div key={group.title} className="rounded-lg border border-page-divider bg-page-inset/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-page-muted">
                      {group.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            link.recommended
                              ? 'border-brand-500/30 bg-brand-500/10 text-brand-300 hover:bg-brand-500/15'
                              : 'border-page-divider bg-page-surface/50 text-page-secondary hover:bg-page-surface-hover hover:text-page'
                          }`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
