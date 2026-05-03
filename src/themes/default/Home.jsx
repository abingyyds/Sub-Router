import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Gauge,
  KeyRound,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite, useCurrency } from '../../context/SiteContext';
import { getSiteModels, getSitePackages, Q } from '../../api';
import { calcOfficialEquivList } from '../../utils/officialEquiv';
import RotatingEquiv from '../../components/bits/RotatingEquiv';
import CountUp from '../../components/bits/CountUp';
import FadeContent from '../../components/bits/FadeContent';
import ApiEndpoints from '../../components/ApiEndpoints';
import { getHomeContent } from '../../utils/siteContent';
import HomeHeroImage from '../shared/HomeHeroImage';

export default function DefaultHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { site } = useSite();
  const { fmtCNY } = useCurrency();
  const [models, setModels] = useState([]);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    getSiteModels().then(r => { if (r.data.success) setModels(r.data.data || []); }).catch(() => {});
    getSitePackages().then(r => { if (r.data.success) setPackages(r.data.data || []); }).catch(() => {});
  }, []);

  const enabledModels = useMemo(() => models.filter(m => m.enabled !== false), [models]);
  const visiblePackages = useMemo(() => packages.filter(p => p.enabled), [packages]);
  const modelPreview = enabledModels.slice(0, 6);
  const homeContent = getHomeContent(site, t);

  const features = [
    {
      title: t('home.lightningFast'),
      desc: t('home.lightningFastDesc'),
      icon: Gauge,
      tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    },
    {
      title: t('home.securePrivate'),
      desc: t('home.securePrivateDesc'),
      icon: ShieldCheck,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
    {
      title: t('home.payAsYouGo'),
      desc: t('home.payAsYouGoDesc'),
      icon: WalletCards,
      tone: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
  ];

  return (
    <div className="relative overflow-hidden">
      <section className="relative border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fb_100%)]">
        <div className="absolute inset-0 pointer-events-none opacity-[0.55] [background-image:linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(90deg,#e5e7eb_1px,transparent_1px)] [background-size:44px_44px]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-20 lg:pt-20">
          <FadeContent blur duration={700} delay={80}>
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
                <Activity className="h-4 w-4 text-emerald-600" />
                {homeContent.heroTagline}
              </div>

              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {site?.name || t('home.defaultHeroTitle')}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                {homeContent.heroSubtitle}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                    {t('home.goToDashboard')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                    >
                      {t('home.getStarted')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/pricing"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      {t('home.viewPricing')}
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                <Metric value={enabledModels.length || 50} suffix="+" label={t('home.aiModels')} />
                <Metric value={99.9} suffix="%" label={t('home.uptime')} />
                <Metric value={50} prefix="<" suffix="ms" label={t('home.latency')} />
              </div>
            </div>
          </FadeContent>

          <FadeContent blur duration={700} delay={220}>
            {homeContent.heroImage ? (
              <HomeHeroImage src={homeContent.heroImage} alt={site?.name} className="aspect-[4/3]" />
            ) : (
              <HeroConsole models={modelPreview} t={t} />
            )}
          </FadeContent>
        </div>
      </section>

      <ApiEndpoints />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <FadeContent blur duration={700} delay={80}>
          <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('home.whyChooseUs')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t('home.whyChooseUsDesc')}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg ring-1 ${feature.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </FadeContent>
      </section>

      {enabledModels.length > 0 && (
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <FadeContent blur duration={700} delay={80}>
              <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('home.availableModels')}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t('home.availableModelsDesc', { count: enabledModels.length })}
                  </p>
                </div>
                {enabledModels.length > 8 && (
                  <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                    {t('home.viewAllModels', { count: enabledModels.length })}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {enabledModels.slice(0, 8).map((m, i) => (
                  <div key={m.id || i} className="flex min-h-16 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-700 ring-1 ring-slate-200">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <span className="min-w-0 truncate font-mono text-sm font-medium text-slate-800">
                      {m.display_name || m.model_name}
                    </span>
                  </div>
                ))}
              </div>
            </FadeContent>
          </div>
        </section>
      )}

      {visiblePackages.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <FadeContent blur duration={700} delay={80}>
            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('home.plansPackages')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t('home.choosePlan')}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {visiblePackages.slice(0, 3).map((pkg, i) => {
                const quotaDollars = pkg.quota_amount > 0 ? pkg.quota_amount / Q : 0;
                const rp = pkg.quota_reset_period || 'never';
                let tqd = quotaDollars;
                if (rp !== 'never' && pkg.duration > 0 && quotaDollars > 0) {
                  let n = rp === 'daily' ? pkg.duration : rp === 'weekly' ? Math.floor(pkg.duration / 7) : rp === 'monthly' ? Math.floor(pkg.duration / 30) : 1;
                  if (n < 1) n = 1;
                  tqd = quotaDollars * n;
                }
                const equiv = calcOfficialEquivList(enabledModels, tqd);
                const featured = i === 1;

                return (
                  <div
                    key={pkg.id}
                    className={`flex min-h-[280px] flex-col rounded-lg border p-6 shadow-sm ${
                      featured ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-200 bg-white'
                    }`}
                  >
                    {featured && (
                      <span className="mb-3 w-fit rounded-full bg-indigo-700 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                        {t('home.popular')}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-slate-950">{pkg.name}</h3>
                    {pkg.description && <p className="mt-2 text-sm leading-6 text-slate-600">{pkg.description}</p>}

                    <div className="mt-auto pt-6">
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-950">{fmtCNY(pkg.price)}</span>
                        {pkg.original_price > pkg.price && (
                          <span className="pb-1 text-sm text-slate-400 line-through">{fmtCNY(pkg.original_price)}</span>
                        )}
                      </div>
                      {pkg.duration > 0 && <p className="mt-1 text-xs font-medium text-slate-500">{t('home.days', { count: pkg.duration })}</p>}
                      {equiv.length > 0 && (
                        <p className="mt-3 text-xs font-medium text-amber-700">
                          <RotatingEquiv items={equiv} text={(item) => t('packages.officialEquiv', { model: item.label, amount: item.equivDollars })} />
                        </p>
                      )}
                    </div>

                    <Link
                      to={user ? '/packages' : '/register'}
                      className={`mt-5 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                        featured ? 'bg-indigo-700 text-white hover:bg-indigo-800' : 'bg-slate-950 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {user ? t('home.subscribe') : t('home.getStarted')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </FadeContent>
        </section>
      )}

      <section className="border-t border-slate-200 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 text-white sm:px-6 md:flex-row md:items-center md:justify-between">
          <FadeContent blur duration={700} delay={80}>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{t('home.readyToStart')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t('home.readyToStartDesc')}</p>
            </div>
          </FadeContent>

          <FadeContent blur duration={700} delay={160}>
            <div className="flex flex-col gap-3 sm:flex-row">
              {user ? (
                <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100">
                  {t('home.goToDashboard')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100">
                    {t('home.createFreeAccount')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
                    {t('home.signIn')}
                  </Link>
                </>
              )}
            </div>
          </FadeContent>
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label, prefix = '', suffix = '' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="text-xl font-black tracking-tight text-slate-950">
        {prefix}<CountUp from={0} to={value} duration={2} />{suffix}
      </div>
      <p className="mt-1 truncate text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function HeroConsole({ models, t }) {
  const rows = models.length > 0 ? models : [
    { display_name: 'gpt-4o-mini' },
    { display_name: 'claude-3.5-sonnet' },
    { display_name: 'gemini-1.5-pro' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-200/80">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="font-mono text-xs text-slate-400">/v1/chat/completions</span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_0.86fr]">
          <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <KeyRound className="h-4 w-4 text-emerald-400" />
              {t('nav.apiKeys')}
            </div>
            <pre className="overflow-hidden rounded-lg bg-black/40 p-4 text-xs leading-6 text-slate-300">
{`curl https://api.example.com/v1/chat/completions
  -H "Authorization: Bearer sk-..."
  -d '{"model":"${rows[0]?.display_name || rows[0]?.model_name}"}'`}
            </pre>
          </div>

          <div className="p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <CheckCircle2 className="h-4 w-4 text-indigo-300" />
              {t('home.availableModels')}
            </div>
            <div className="space-y-2">
              {rows.slice(0, 4).map((model, index) => (
                <div key={model.id || model.model_name || model.display_name || index} className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-2">
                  <span className="min-w-0 truncate font-mono text-xs text-slate-200">
                    {model.display_name || model.model_name}
                  </span>
                  <span className="ml-3 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">OK</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
