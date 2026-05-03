import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BadgeCheck, Boxes, Cpu, Gem, Layers3, PackageCheck, ShoppingBag, Tags } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite, useCurrency } from '../../context/SiteContext';
import { calcOfficialEquivList } from '../../utils/officialEquiv';
import { packageQuotaDollars, useHomeData } from '../shared/useHomeData';
import CountUp from '../../components/bits/CountUp';
import FadeContent from '../../components/bits/FadeContent';
import RotatingEquiv from '../../components/bits/RotatingEquiv';
import ApiEndpoints from '../../components/ApiEndpoints';
import { getHomeContent } from '../../utils/siteContent';
import HomeHeroImage from '../shared/HomeHeroImage';

const accents = [
  { border: 'border-orange-200', soft: 'bg-orange-50', text: 'text-orange-700', line: 'bg-orange-500' },
  { border: 'border-amber-200', soft: 'bg-amber-50', text: 'text-amber-700', line: 'bg-amber-400' },
  { border: 'border-emerald-200', soft: 'bg-emerald-50', text: 'text-emerald-700', line: 'bg-emerald-500' },
  { border: 'border-sky-200', soft: 'bg-sky-50', text: 'text-sky-700', line: 'bg-sky-500' },
  { border: 'border-violet-200', soft: 'bg-violet-50', text: 'text-violet-700', line: 'bg-violet-500' },
  { border: 'border-rose-200', soft: 'bg-rose-50', text: 'text-rose-700', line: 'bg-rose-500' },
];

export default function MarketHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { site } = useSite();
  const { fmtCNY } = useCurrency();
  const { enabledModels, visiblePackages } = useHomeData();
  const models = enabledModels.slice(0, 8);
  const homeContent = getHomeContent(site, t);

  return (
    <div className="relative overflow-hidden bg-[#fbfaf7] text-stone-950">
      <section className="relative border-b border-stone-200 bg-[#fbfaf7]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbfaf7_0%,#ffffff_100%)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(#d6d3d1_1px,transparent_1px),linear-gradient(90deg,#d6d3d1_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-20 lg:pt-20">
          <FadeContent blur duration={700} delay={80}>
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm">
                <ShoppingBag className="h-4 w-4 text-orange-600" />
                {homeContent.heroTagline}
              </div>
              <h1 className="text-4xl font-black tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                {site?.name || t('home.defaultHeroTitle')}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-stone-600 sm:text-lg">
                {homeContent.heroSubtitle}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <MarketButton to={user ? '/dashboard' : '/register'}>
                  {user ? t('home.goToDashboard') : t('home.getStarted')}
                </MarketButton>
                <Link to="/packages" className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-800 shadow-sm transition-colors hover:border-stone-400 hover:bg-stone-50">
                  {t('home.plansPackages')}
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
              <MarketBoard models={models} t={t} />
            )}
          </FadeContent>
        </div>
      </section>

      <ApiEndpoints />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionTitle title={t('home.whyChooseUs')} desc={t('home.whyChooseUsDesc')} />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Layers3, title: t('home.lightningFast'), desc: t('home.lightningFastDesc'), accent: accents[3] },
            { icon: BadgeCheck, title: t('home.securePrivate'), desc: t('home.securePrivateDesc'), accent: accents[2] },
            { icon: Tags, title: t('home.payAsYouGo'), desc: t('home.payAsYouGoDesc'), accent: accents[0] },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg ${item.accent.soft} ${item.accent.text}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-black text-stone-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {enabledModels.length > 0 && (
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <SectionTitle title={t('home.availableModels')} desc={t('home.availableModelsDesc', { count: enabledModels.length })} compact />
              {enabledModels.length > 8 && (
                <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-black text-orange-700 hover:text-stone-950">
                  {t('home.viewAllModels', { count: enabledModels.length })}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {models.map((model, index) => <ModelCard key={model.id || index} model={model} index={index} />)}
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

      <section className="border-t border-stone-200 bg-stone-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 text-white sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{t('home.readyToStart')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">{t('home.readyToStartDesc')}</p>
          </div>
          <MarketButton to={user ? '/dashboard' : '/register'} light>
            {user ? t('home.goToDashboard') : t('home.createFreeAccount')}
          </MarketButton>
        </div>
      </section>
    </div>
  );
}

function MarketButton({ to, children, light = false }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-black shadow-sm transition-colors ${
        light ? 'bg-white text-stone-950 hover:bg-stone-100' : 'bg-stone-950 text-white hover:bg-orange-600'
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function Metric({ value, label, prefix = '', suffix = '' }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-xl font-black text-stone-950">{prefix}<CountUp from={0} to={value} duration={2} />{suffix}</div>
      <p className="mt-1 truncate text-xs font-bold text-stone-500">{label}</p>
    </div>
  );
}

function SectionTitle({ title, desc, compact = false }) {
  return (
    <div className={compact ? 'max-w-2xl' : 'mb-8 max-w-2xl'}>
      <h2 className="text-2xl font-black tracking-tight text-stone-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{desc}</p>
    </div>
  );
}

function MarketBoard({ models, t }) {
  const rows = models.length ? models : [
    { display_name: 'gpt-4o-mini' },
    { display_name: 'claude-sonnet' },
    { display_name: 'gemini-pro' },
    { display_name: 'deepseek-chat' },
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_28px_80px_rgba(41,37,36,0.12)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-950 text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-black text-stone-950">{t('home.availableModels')}</p>
            <p className="text-xs font-bold text-stone-500">curated model shelf</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">{rows.length}+ live</span>
      </div>

      <div className="rounded-xl border border-stone-200 bg-[#fbfaf7] p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.slice(0, 6).map((model, index) => <ModelCard key={model.id || index} model={model} index={index} compact />)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Catalog', value: `${rows.length}+` },
          { label: 'Routing', value: 'Auto' },
          { label: 'Billing', value: 'Clear' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{item.label}</p>
            <p className="mt-1 font-mono text-sm font-black text-stone-950">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelCard({ model, index, compact = false }) {
  const accent = accents[index % accents.length];
  return (
    <div className={`group relative overflow-hidden rounded-xl border ${compact ? 'bg-white' : 'bg-[#fbfaf7]'} ${accent.border} p-4 shadow-sm transition-colors hover:bg-white`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${accent.line}`} />
      <div className="flex items-start justify-between gap-3">
        <div className={`flex ${compact ? 'h-9 w-9' : 'h-10 w-10'} shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
          <Cpu className="h-4 w-4" />
        </div>
        <span className={`rounded-md ${accent.soft} px-2 py-1 text-[10px] font-black ${accent.text}`}>LIVE</span>
      </div>
      <p className="mt-4 truncate font-mono text-sm font-black text-stone-950">{model.display_name || model.model_name}</p>
      {!compact && <p className="mt-2 text-xs font-semibold text-stone-500">provider ready / transparent price</p>}
    </div>
  );
}

function PackageCard({ pkg, index, models, fmtCNY, t, user }) {
  const accent = accents[index % accents.length];
  const equiv = calcOfficialEquivList(models, packageQuotaDollars(pkg));
  const featured = index === 1;
  return (
    <div className={`flex min-h-[300px] flex-col rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${featured ? 'border-orange-200 ring-1 ring-orange-100' : 'border-stone-200'}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
          {featured ? <Gem className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}
        </div>
        {featured && <span className="rounded-md bg-stone-950 px-2.5 py-1 text-xs font-black text-white">{t('home.popular')}</span>}
      </div>
      <h3 className="text-lg font-black text-stone-950">{pkg.name}</h3>
      {pkg.description && <p className="mt-2 text-sm leading-6 text-stone-600">{pkg.description}</p>}
      <div className="mt-auto pt-6">
        <span className="text-3xl font-black text-stone-950">{fmtCNY(pkg.price)}</span>
        {pkg.original_price > pkg.price && <span className="ml-2 text-sm text-stone-400 line-through">{fmtCNY(pkg.original_price)}</span>}
        {pkg.duration > 0 && <p className="mt-1 text-xs font-bold text-stone-500">{t('home.days', { count: pkg.duration })}</p>}
        {equiv.length > 0 && (
          <p className="mt-3 text-xs font-bold text-orange-700">
            <RotatingEquiv items={equiv} text={(item) => t('packages.officialEquiv', { model: item.label, amount: item.equivDollars })} />
          </p>
        )}
      </div>
      <div className="mt-5">
        <MarketButton to={user ? '/packages' : '/register'}>{user ? t('home.subscribe') : t('home.getStarted')}</MarketButton>
      </div>
    </div>
  );
}
