import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Boxes,
  ExternalLink,
  Layers3,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_MARKET_APPS } from '../constants/appMarket';

function CoverFallback({ app, t }) {
  return (
    <div
      className={`flex h-full min-h-[260px] items-center justify-center bg-gradient-to-br p-8 ${
        app.coverTone || 'from-zinc-950 via-zinc-700 to-brand-600'
      }`}
    >
      <div className="flex max-w-xs flex-col items-center gap-4 text-center text-white">
        <img
          src={app.logo}
          alt={`${app.name} logo`}
          className="h-20 w-20 rounded-xl bg-white/95 object-contain p-3 shadow-lg"
          loading="lazy"
        />
        <div>
          <div className="text-xl font-semibold">{app.name}</div>
          <div className="mt-2 text-sm leading-5 text-white/80">
            {t(app.taglineKey)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppMarket() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div className="space-y-4">
          <div className="inline-flex w-fit items-center rounded-full border border-page-divider bg-page-surface px-3 py-1 text-sm font-semibold text-page">
            <Boxes className="mr-1.5 h-3.5 w-3.5 text-page-link" />
            {t('appMarket.badge')}
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-page sm:text-4xl">
              {t('appMarket.title')}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-page-secondary sm:text-base">
              {t('appMarket.subtitle')}
            </p>
          </div>
        </div>

        <div className="glass grid grid-cols-3 gap-2 rounded-2xl p-3 text-center shadow-sm">
          <div className="space-y-1">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-page-success">
              <ShieldCheck size={18} />
            </div>
            <div className="text-xs font-medium text-page">
              {t('appMarket.statAccount')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <Layers3 size={18} />
            </div>
            <div className="text-xs font-medium text-page">
              {t('appMarket.statProviders')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <WalletCards size={18} />
            </div>
            <div className="text-xs font-medium text-page">
              {t('appMarket.statBilling')}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5">
        {APP_MARKET_APPS.map((app) => (
          <article
            key={app.id}
            className="glass overflow-hidden rounded-2xl shadow-sm"
          >
            <div className="grid min-h-[360px] lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
              <div className="flex flex-col justify-between gap-6 p-5 sm:p-7">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <img
                      src={app.logo}
                      alt={`${app.name} logo`}
                      className="h-16 w-16 rounded-xl border border-page-divider bg-white object-contain p-2 shadow-sm"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-page">
                          {app.name}
                        </h2>
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                          {t(app.statusKey)}
                        </span>
                        <span className="rounded-full border border-page-divider bg-page-surface px-2.5 py-1 text-xs font-semibold text-page-secondary">
                          {t(app.categoryKey)}
                        </span>
                      </div>
                      <p className="text-base font-medium text-page">
                        {t(app.taglineKey)}
                      </p>
                      <p className="max-w-2xl text-sm leading-6 text-page-secondary">
                        {t(app.descriptionKey)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {app.integration.map((item) => (
                      <div
                        key={item}
                        className="flex min-h-12 items-center gap-2 rounded-xl border border-page-divider bg-page-surface px-3 py-2 text-sm text-page"
                      >
                        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-page-success" />
                        <span>{t(item)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {app.featureKeys.map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex items-center rounded-full border border-page-divider bg-page-surface px-2.5 py-1 text-xs font-semibold text-page-secondary"
                      >
                        <Sparkles className="mr-1.5 h-3 w-3 text-page-link" />
                        {t(feature)}
                      </span>
                    ))}
                    <span className="rounded-full border border-page-divider bg-page-surface px-2.5 py-1 text-xs font-semibold text-page-secondary">
                      {app.license}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {user ? (
                    <a
                      href={app.appUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center justify-center"
                    >
                      {t('appMarket.openApp')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to="/login"
                      className="btn-primary inline-flex items-center justify-center"
                    >
                      {t('appMarket.loginToUse')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  )}
                  <a
                    href={app.appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center justify-center"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('appMarket.visitSite')}
                  </a>
                  <a
                    href={app.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-medium text-page-secondary transition-colors hover:bg-page-surface-hover hover:text-page"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('appMarket.sourceLink')}
                  </a>
                </div>
              </div>

              <div className="relative min-h-[260px] overflow-hidden border-t border-page-divider bg-page-surface lg:border-l lg:border-t-0">
                {app.cover ? (
                  <img
                    src={app.cover}
                    alt={`${app.name} preview`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <CoverFallback app={app} t={t} />
                )}
                <div
                  className="absolute inset-x-0 bottom-0 p-5"
                  style={{
                    background:
                      'linear-gradient(to top, var(--page-bg) 0%, var(--page-bg) 20%, transparent 100%)',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-page-secondary">
                    <span className="rounded-lg bg-page-surface px-2 py-1">
                      {t('appMarket.onlineApp')}
                    </span>
                    <span className="rounded-lg bg-page-surface px-2 py-1">
                      {t('appMarket.openSource')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-page-divider bg-page-surface px-5 py-6 text-center">
        <h2 className="text-base font-semibold text-page">
          {t('appMarket.moreComing')}
        </h2>
        <p className="mt-2 text-sm text-page-secondary">
          {t('appMarket.moreComingDesc')}
        </p>
      </section>
    </div>
  );
}
