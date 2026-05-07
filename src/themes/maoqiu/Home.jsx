import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Cpu,
  Gauge,
  KeyRound,
  Layers3,
  Palette,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite, useCurrency } from '../../context/SiteContext';
import { calcOfficialEquivList } from '../../utils/officialEquiv';
import { getHomeContent } from '../../utils/siteContent';
import ApiEndpoints from '../../components/ApiEndpoints';
import CountUp from '../../components/bits/CountUp';
import FadeContent from '../../components/bits/FadeContent';
import RotatingEquiv from '../../components/bits/RotatingEquiv';
import { packageQuotaDollars, useHomeData } from '../shared/useHomeData';
import heroImage from '../../assets/maoqiu-ai.png';

const features = [
  { icon: Gauge, title: 'lightningFast', desc: 'lightningFastDesc', color: 'from-[#0788ff] to-[#2250ff]' },
  { icon: ShieldCheck, title: 'securePrivate', desc: 'securePrivateDesc', color: 'from-[#2250ff] to-[#8a45ff]' },
  { icon: WalletCards, title: 'payAsYouGo', desc: 'payAsYouGoDesc', color: 'from-[#8a45ff] to-[#ef4bff]' },
];

export default function MaoqiuHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { site } = useSite();
  const { fmtCNY } = useCurrency();
  const { enabledModels, visiblePackages } = useHomeData();
  const homeContent = getHomeContent(site, t);
  const models = enabledModels.slice(0, 8);

  return (
    <div className="overflow-hidden bg-white text-slate-950">
      <section className="relative border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_58%,#ffffff_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(circle_at_26%_18%,rgba(7,136,255,0.14),transparent_34%),radial-gradient(circle_at_74%_12%,rgba(239,75,255,0.16),transparent_32%)]" />
        <div className="absolute left-[8%] top-24 hidden h-12 w-12 rounded-full bg-gradient-to-br from-[#0788ff] to-[#ef4bff] opacity-80 blur-[1px] md:block maoqiu-float-dot" />
        <div className="absolute right-[12%] top-32 hidden h-7 w-7 rounded-full bg-gradient-to-br from-[#ef4bff] to-[#8a45ff] opacity-70 md:block maoqiu-float-dot maoqiu-float-dot--slow" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-18 lg:pt-16">
          <FadeContent blur duration={700} delay={80}>
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/88 px-3 py-1.5 text-sm font-bold text-[#1b2a5b] shadow-sm">
                <Sparkles className="h-4 w-4 text-[#8a45ff]" />
                {homeContent.heroTagline}
              </div>

              <h1 className="max-w-2xl text-4xl font-black tracking-tight text-[#071337] sm:text-5xl lg:text-6xl">
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
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[#071337] shadow-sm transition-colors hover:border-blue-200 hover:bg-[#f7f9ff]"
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
            <HeroPanel models={models} siteName={site?.name} />
          </FadeContent>
        </div>
      </section>

      <ApiEndpoints />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionTitle title={t('home.whyChooseUs')} desc={t('home.whyChooseUsDesc')} />
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-white shadow-lg shadow-blue-500/10`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#071337]">{t(`home.${item.title}`)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t(`home.${item.desc}`)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {enabledModels.length > 0 && (
        <section className="border-y border-slate-200 bg-[#f7f9ff]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <SectionTitle title={t('home.availableModels')} desc={t('home.availableModelsDesc', { count: enabledModels.length })} compact />
              {enabledModels.length > 8 && (
                <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2352ff] hover:text-[#071337]">
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

      <section className="border-t border-slate-200 bg-[#071337]">
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-black shadow-sm transition-all ${
        light
          ? 'bg-white text-[#071337] hover:bg-slate-100'
          : 'bg-gradient-to-r from-[#0788ff] via-[#2250ff] to-[#ef4bff] text-white hover:brightness-105'
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function Metric({ value, label, prefix = '', suffix = '' }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white/92 p-4 shadow-sm">
      <div className="text-xl font-black text-[#071337]">{prefix}<CountUp from={0} to={value} duration={2} />{suffix}</div>
      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function SectionTitle({ title, desc, compact = false }) {
  return (
    <div className={compact ? 'max-w-2xl' : 'mb-8 max-w-2xl'}>
      <h2 className="text-2xl font-black tracking-tight text-[#071337]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
    </div>
  );
}

function HeroPanel({ models, siteName }) {
  const preview = models.length ? models : [
    { display_name: 'GPT-4o Mini' },
    { display_name: 'Claude Sonnet' },
    { display_name: 'Gemini Pro' },
    { display_name: 'DeepSeek Chat' },
  ];

  return (
    <div className="relative mx-auto max-w-xl">
      <div className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_22%_12%,rgba(7,136,255,0.22),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(239,75,255,0.22),transparent_34%)] blur-2xl" />
      <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_28px_90px_rgba(30,64,175,0.14)]">
        <div className="grid items-center gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-[#fbfdff] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_28%,rgba(7,136,255,0.1),transparent_34%),radial-gradient(circle_at_72%_22%,rgba(239,75,255,0.12),transparent_32%)]" />
            <div className="maoqiu-hero-orbit" />
            <img src={heroImage} alt={siteName || 'Maoqiu AI'} className="relative mx-auto aspect-square w-full max-w-[260px] object-contain maoqiu-hero-mark" />
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-[#071337] p-4 text-white">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-black">
                  <Layers3 className="h-4 w-4 text-[#7ac7ff]" />
                  Smart Route
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-[#f0b8ff]">LIVE</span>
              </div>
              <div className="space-y-2">
                {preview.slice(0, 4).map((model, index) => (
                  <RouteRow key={model.id || index} model={model} index={index} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniStat icon={KeyRound} label="Keys" value="ready" />
              <MiniStat icon={Palette} label="Theme" value="custom" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteRow({ model, index }) {
  const active = index === 0;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${active ? 'border-[#7ac7ff]/30 bg-white/12' : 'border-white/10 bg-white/[0.06]'}`}>
      <span className="min-w-0 truncate font-mono text-xs font-semibold text-slate-100">{model.display_name || model.model_name}</span>
      <span className={active ? 'text-xs font-black text-[#7ac7ff]' : 'text-xs font-semibold text-slate-400'}>
        {active ? 'BEST' : `R${index + 1}`}
      </span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-[#f7f9ff] p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
        <Icon className="h-3.5 w-3.5 text-[#2250ff]" />
        {label}
      </div>
      <p className="mt-2 font-mono text-sm font-black text-[#071337]">{value}</p>
    </div>
  );
}

function ModelTile({ model, index }) {
  const active = index % 3 === 0;
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-white">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0f6ff] text-[#2352ff] ring-1 ring-blue-100">
          <Cpu className="h-4 w-4" />
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${active ? 'bg-blue-50 text-blue-700' : 'bg-fuchsia-50 text-fuchsia-700'}`}>
          {active ? 'PRIMARY' : 'ONLINE'}
        </span>
      </div>
      <p className="truncate font-mono text-sm font-semibold text-[#071337]">{model.display_name || model.model_name}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">balanced route pool</p>
    </div>
  );
}

function PackageCard({ pkg, index, models, fmtCNY, t, user }) {
  const equiv = calcOfficialEquivList(models, packageQuotaDollars(pkg));
  const featured = index === 1;
  return (
    <div className={`flex min-h-[280px] flex-col rounded-xl border p-6 shadow-sm ${featured ? 'border-blue-200 bg-[#f2f7ff]' : 'border-slate-200 bg-white'}`}>
      {featured && <span className="mb-3 w-fit rounded-md bg-gradient-to-r from-[#0788ff] to-[#ef4bff] px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white">{t('home.popular')}</span>}
      <h3 className="text-lg font-black text-[#071337]">{pkg.name}</h3>
      {pkg.description && <p className="mt-2 text-sm leading-6 text-slate-600">{pkg.description}</p>}
      <div className="mt-auto pt-6">
        <span className="text-3xl font-black text-[#071337]">{fmtCNY(pkg.price)}</span>
        {pkg.original_price > pkg.price && <span className="ml-2 text-sm text-slate-400 line-through">{fmtCNY(pkg.original_price)}</span>}
        {pkg.duration > 0 && <p className="mt-1 text-xs font-semibold text-slate-500">{t('home.days', { count: pkg.duration })}</p>}
        {equiv.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-[#8a45ff]">
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
