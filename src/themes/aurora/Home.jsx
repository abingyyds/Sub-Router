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
import { packageQuotaDollars, useHomeData } from '../shared/useHomeData';
import { PUBLIC_API_ENDPOINT_COUNT } from '../../constants/apiEndpoints';
import Aurora from '../../components/bits/Aurora';
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
              <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <span className="min-w-0 break-words">{homeContent.heroTagline}</span>
              </div>

              <h1 className="max-w-2xl break-words text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
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
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  {t('home.viewPricing')}
                </Link>
              </div>

              <div className="mt-10 flex max-w-xl flex-wrap gap-x-7 gap-y-3 border-t border-slate-300 pt-5">
                <HeroFact value={enabledModels.length} label={t('home.aiModels')} />
                <HeroFact value={visiblePackages.length} label={t('home.plansPackages')} />
                <HeroFact value={PUBLIC_API_ENDPOINT_COUNT} label={t('home.apiEndpointsTitle')} />
              </div>
            </div>
          </FadeContent>

          <FadeContent blur duration={700} delay={180}>
            {homeContent.heroImage ? (
              <HomeHeroImage src={homeContent.heroImage} alt={site?.name} className="aspect-[4/3]" />
            ) : (
              <AuroraModelCatalog models={enabledModels} t={t} />
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

function HeroFact({ value, label }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-black text-slate-950">{value}</span>
      <span className="text-xs font-semibold text-slate-500">{label}</span>
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

function AuroraModelCatalog({ models, t }) {
  const preview = models.slice(0, 6);
  return (
    <div className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white/88 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur-xl sm:p-7">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-lg font-black text-slate-950">{t('home.availableModels')}</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">
            {t('home.availableModelsDesc', { count: models.length })}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Cpu className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-x-5 sm:grid-cols-2">
        {preview.map((model, index) => (
          <div key={model.id || index} className="flex min-w-0 items-center gap-3 border-t border-slate-200 py-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-teal-600" />
            <span className="min-w-0 truncate font-mono text-sm font-semibold text-slate-800">
              {model.display_name || model.model_name}
            </span>
          </div>
        ))}
      </div>

      <Link to="/pricing" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-slate-950">
        {t('home.viewAllModels', { count: models.length })}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ModelTile({ model, index }) {
  return (
    <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-blue-200 hover:bg-white">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200">
        <Cpu className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-semibold text-slate-900">{model.display_name || model.model_name}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{String(index + 1).padStart(2, '0')}</p>
      </div>
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
