import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Cpu,
  Gauge,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite, useCurrency } from '../../context/SiteContext';
import { calcOfficialEquivList } from '../../utils/officialEquiv';
import { getHomeContent } from '../../utils/siteContent';
import ApiEndpoints from '../../components/ApiEndpoints';
import FadeContent from '../../components/bits/FadeContent';
import RotatingEquiv from '../../components/bits/RotatingEquiv';
import { packageQuotaDollars, useHomeData } from '../shared/useHomeData';
import { PUBLIC_API_ENDPOINT_COUNT } from '../../constants/apiEndpoints';
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
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-18 lg:pt-16">
          <FadeContent blur duration={700} delay={80}>
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-white/88 px-3 py-1.5 text-sm font-bold text-[#1b2a5b] shadow-sm">
                <Sparkles className="h-4 w-4 text-[#8a45ff]" />
                <span className="min-w-0 break-words">{homeContent.heroTagline}</span>
              </div>

              <h1 className="max-w-2xl break-words text-4xl font-black tracking-tight text-[#071337] sm:text-5xl lg:text-6xl">
                {site?.name || t('home.defaultHeroTitle')}
              </h1>
              <p className="mt-6 max-w-xl break-words text-base leading-8 text-slate-600 sm:text-lg">
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

              <div className="mt-10 flex max-w-xl flex-wrap gap-x-7 gap-y-3 border-t border-blue-100 pt-5">
                <HeroFact value={enabledModels.length} label={t('home.aiModels')} />
                <HeroFact value={visiblePackages.length} label={t('home.plansPackages')} />
                <HeroFact value={PUBLIC_API_ENDPOINT_COUNT} label={t('home.apiEndpointsTitle')} />
              </div>
            </div>
          </FadeContent>

          <FadeContent blur duration={700} delay={180}>
            <BrandModelShowcase models={enabledModels} siteName={site?.name} t={t} />
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
                <ModelTile key={model.id || index} model={model} index={index} t={t} />
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

function HeroFact({ value, label }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-black text-[#071337]">{value}</span>
      <span className="text-xs font-semibold text-slate-500">{label}</span>
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

function BrandModelShowcase({ models, siteName, t }) {
  const preview = models.slice(0, 4);

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute inset-x-8 top-10 h-64 bg-[radial-gradient(circle,rgba(34,80,255,0.16),rgba(239,75,255,0.1)_42%,transparent_72%)] blur-2xl" />
      <img src={heroImage} alt={siteName || 'Maoqiu AI'} className="relative mx-auto aspect-square w-full max-w-[340px] object-contain maoqiu-hero-mark" />

      <div className="relative mt-2 border-t border-blue-100 pt-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-black text-[#071337]">{t('home.availableModels')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('home.availableModelsDesc', { count: models.length })}</p>
          </div>
          <Cpu className="mt-1 h-5 w-5 shrink-0 text-[#2250ff]" />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {preview.map((model) => (
            <div key={model.id || model.model_name} className="min-w-0 rounded-lg border border-blue-100 bg-white/80 px-3 py-2.5 shadow-sm">
              <p className="truncate font-mono text-xs font-semibold text-[#1b2a5b]">{model.display_name || model.model_name}</p>
            </div>
          ))}
        </div>

        <Link to="/pricing" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#2352ff] hover:text-[#071337]">
          {t('home.viewAllModels', { count: models.length })}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function ModelTile({ model, index }) {
  return (
    <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f6ff] text-[#2352ff] ring-1 ring-blue-100">
        <Cpu className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-semibold text-[#071337]">{model.display_name || model.model_name}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{String(index + 1).padStart(2, '0')}</p>
      </div>
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
