import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Gauge,
  KeyRound,
  Layers3,
  Route,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite, useCurrency } from '../../context/SiteContext';
import { calcOfficialEquivList } from '../../utils/officialEquiv';
import { packageQuotaDollars, useHomeData } from '../shared/useHomeData';
import Aurora from '../../components/bits/Aurora';
import CountUp from '../../components/bits/CountUp';
import FadeContent from '../../components/bits/FadeContent';
import RotatingEquiv from '../../components/bits/RotatingEquiv';
import ApiEndpoints from '../../components/ApiEndpoints';
import { getHomeContent } from '../../utils/siteContent';
import HomeHeroImage from '../shared/HomeHeroImage';

const featureCards = [
  { icon: Gauge, tone: 'border-blue-200 bg-blue-50 text-blue-700', key: 'lightningFast', desc: 'lightningFastDesc' },
  { icon: ShieldCheck, tone: 'border-teal-200 bg-teal-50 text-teal-700', key: 'securePrivate', desc: 'securePrivateDesc' },
  { icon: WalletCards, tone: 'border-slate-200 bg-slate-50 text-slate-700', key: 'payAsYouGo', desc: 'payAsYouGoDesc' },
];

export default function AuroraHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { site } = useSite();
  const { fmtCNY } = useCurrency();
  const { enabledModels, visiblePackages } = useHomeData();
  const models = enabledModels.slice(0, 8);
  const homeContent = getHomeContent(site, t);

  return (
    <div className="relative overflow-hidden bg-[#f6f8fb] text-slate-950">
      <section className="relative border-b border-slate-200 bg-[#f6f8fb]">
        <div className="absolute inset-x-0 top-0 h-[360px] opacity-55">
          <Aurora colorStops={['#2563eb', '#0f766e', '#94a3b8']} amplitude={0.28} blend={0.86} speed={0.18} />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,248,251,0.16)_0%,#f6f8fb_68%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-20 lg:pt-20">
          <FadeContent blur duration={700} delay={80}>
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm">
                <Sparkles className="h-4 w-4 text-teal-600" />
                {homeContent.heroTagline}
              </div>

              <h1 className="max-w-2xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {site?.name || t('home.defaultHeroTitle')}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                {homeContent.heroSubtitle}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink to={user ? '/dashboard' : '/register'}>
                  {user ? t('home.goToDashboard') : t('home.getStarted')}
                </PrimaryLink>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  {t('home.viewPricing')}
                </Link>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                <Metric value={enabledModels.length || 50} suffix="+" label={t('home.aiModels')} />
                <Metric value={99.9} suffix="%" label={t('home.uptime')} />
                <Metric value={50} prefix="<" suffix="ms" label={t('home.latency')} />
              </div>
            </div>
          </FadeContent>

          <FadeContent blur duration={700} delay={180}>
            {homeContent.heroImage ? (
              <HomeHeroImage src={homeContent.heroImage} alt={site?.name} className="aspect-[4/3]" />
            ) : (
              <RoutingWorkbench models={models} t={t} />
            )}
          </FadeContent>
        </div>
      </section>

      <ApiEndpoints />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionTitle title={t('home.whyChooseUs')} desc={t('home.whyChooseUsDesc')} />
        <div className="grid gap-4 md:grid-cols-3">
          {featureCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg border ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-950">{t(`home.${item.key}`)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t(`home.${item.desc}`)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {enabledModels.length > 0 && (
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <SectionTitle title={t('home.availableModels')} desc={t('home.availableModelsDesc', { count: enabledModels.length })} compact />
              {enabledModels.length > 8 && (
                <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900">
                  {t('home.viewAllModels', { count: enabledModels.length })}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {models.map((model, index) => (
                <ModelTile key={model.id || index} model={model} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {visiblePackages.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionTitle title={t('home.plansPackages')} desc={t('home.choosePlan')} />
          <div className="grid gap-4 lg:grid-cols-3">
            {visiblePackages.slice(0, 3).map((pkg, index) => (
              <PackageCard key={pkg.id} pkg={pkg} index={index} models={enabledModels} fmtCNY={fmtCNY} t={t} user={user} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-slate-200 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 text-white sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{t('home.readyToStart')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t('home.readyToStartDesc')}</p>
          </div>
          <PrimaryLink to={user ? '/dashboard' : '/register'} light>
            {user ? t('home.goToDashboard') : t('home.createFreeAccount')}
          </PrimaryLink>
        </div>
      </section>
    </div>
  );
}

function PrimaryLink({ to, children, light = false }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-black shadow-sm transition-colors ${
        light ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-blue-700'
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function Metric({ value, label, prefix = '', suffix = '' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <div className="text-xl font-black text-slate-950">{prefix}<CountUp from={0} to={value} duration={2} />{suffix}</div>
      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function SectionTitle({ title, desc, compact = false }) {
  return (
    <div className={compact ? 'max-w-2xl' : 'mb-8 max-w-2xl'}>
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
    </div>
  );
}

function RoutingWorkbench({ models, t }) {
  const preview = models.length ? models : [
    { display_name: 'gpt-4o-mini' },
    { display_name: 'claude-sonnet' },
    { display_name: 'gemini-pro' },
    { display_name: 'deepseek-chat' },
  ];
  const rows = [
    { label: 'latency', value: '42ms', tone: 'text-blue-200' },
    { label: 'fallback', value: 'armed', tone: 'text-teal-200' },
    { label: 'providers', value: `${preview.length}+`, tone: 'text-slate-100' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
      <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-950">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black">Routing Workbench</p>
              <p className="mt-1 text-xs font-medium text-slate-400">live model orchestration</p>
            </div>
          </div>
          <span className="w-fit rounded-md bg-teal-400/15 px-2.5 py-1 text-xs font-black text-teal-200 ring-1 ring-teal-300/20">HEALTHY</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {rows.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className={`mt-1 font-mono text-sm font-black ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-[#070b12] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Layers3 className="h-4 w-4 text-blue-300" />
              route decision
            </div>
            <span className="font-mono text-xs text-slate-500">POST /v1/chat</span>
          </div>

          <div className="space-y-3">
            {preview.slice(0, 4).map((model, index) => (
              <RouteRow
                key={model.id || index}
                model={model}
                index={index}
                active={index === 0}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
            <KeyRound className="h-4 w-4 text-teal-700" />
            {t('home.availableModels')}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {preview.slice(0, 4).map((model, index) => (
              <div key={model.id || index} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="truncate font-mono text-xs font-semibold text-slate-700">{model.display_name || model.model_name}</span>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">policy</p>
          <p className="mt-2 text-sm font-black text-slate-950">best price + low latency</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">fallback enabled across healthy providers</p>
        </div>
      </div>
    </div>
  );
}

function RouteRow({ model, index, active }) {
  const width = ['82%', '64%', '52%', '38%'][index] || '44%';
  return (
    <div className={`rounded-lg border p-3 ${active ? 'border-blue-400/40 bg-blue-400/10' : 'border-white/10 bg-white/[0.035]'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-mono text-xs font-semibold text-slate-200">{model.display_name || model.model_name}</span>
        <span className={active ? 'text-xs font-black text-blue-200' : 'text-xs font-semibold text-slate-500'}>
          {active ? 'PRIMARY' : `R${index + 1}`}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-teal-300" style={{ width }} />
      </div>
    </div>
  );
}

function ModelTile({ model, index }) {
  const active = index % 3 === 0;
  return (
    <div className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-blue-200 hover:bg-white">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200">
          <Cpu className="h-4 w-4" />
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${active ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
          {active ? 'PRIMARY' : 'ONLINE'}
        </span>
      </div>
      <p className="truncate font-mono text-sm font-semibold text-slate-900">{model.display_name || model.model_name}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">balanced route pool</p>
    </div>
  );
}

function PackageCard({ pkg, index, models, fmtCNY, t, user }) {
  const equiv = calcOfficialEquivList(models, packageQuotaDollars(pkg));
  const featured = index === 1;
  return (
    <div className={`flex min-h-[280px] flex-col rounded-xl border p-6 shadow-sm ${featured ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      {featured && <span className="mb-3 w-fit rounded-md bg-blue-700 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white">{t('home.popular')}</span>}
      <h3 className="text-lg font-black text-slate-950">{pkg.name}</h3>
      {pkg.description && <p className="mt-2 text-sm leading-6 text-slate-600">{pkg.description}</p>}
      <div className="mt-auto pt-6">
        <span className="text-3xl font-black text-slate-950">{fmtCNY(pkg.price)}</span>
        {pkg.original_price > pkg.price && <span className="ml-2 text-sm text-slate-400 line-through">{fmtCNY(pkg.original_price)}</span>}
        {pkg.duration > 0 && <p className="mt-1 text-xs font-semibold text-slate-500">{t('home.days', { count: pkg.duration })}</p>}
        {equiv.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-amber-700">
            <RotatingEquiv items={equiv} text={(item) => t('packages.officialEquiv', { model: item.label, amount: item.equivDollars })} />
          </p>
        )}
      </div>
      <div className="mt-5">
        <PrimaryLink to={user ? '/packages' : '/register'}>{user ? t('home.subscribe') : t('home.getStarted')}</PrimaryLink>
      </div>
    </div>
  );
}
