import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSite, useCurrency } from '../../context/SiteContext';
import { getSiteModels, getSitePackages, Q } from '../../api';
import { calcOfficialEquivList } from '../../utils/officialEquiv';
import { PUBLIC_API_ENDPOINT_COUNT } from '../../constants/apiEndpoints';
import RotatingEquiv from '../../components/bits/RotatingEquiv';
import FadeContent from '../../components/bits/FadeContent';
import ApiEndpoints from '../../components/ApiEndpoints';
import { getHomeContent } from '../../utils/siteContent';
import HomeHeroImage from '../shared/HomeHeroImage';

export default function MinimalHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { site } = useSite();
  const { symbol, rate, fmtCNY } = useCurrency();
  const [models, setModels] = useState([]);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    getSiteModels().then(r => { if (r.data.success) setModels(r.data.data || []); }).catch(() => {});
    getSitePackages().then(r => { if (r.data.success) setPackages(r.data.data || []); }).catch(() => {});
  }, []);

  const enabledModels = models.filter(m => m.enabled !== false);
  const visiblePackageCount = packages.filter(p => p.enabled).length;
  const homeContent = getHomeContent(site, t);

  return (
    <div className="relative">
      {/* Hero Section — clean and minimal */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:pt-32">
        <FadeContent blur duration={800} delay={100}>
          <div className="min-w-0 max-w-3xl">
            <p className="mb-5 break-words text-sm font-medium tracking-wide text-neutral-400">
              {homeContent.heroTagline}
            </p>
            <h1 className="break-words text-4xl font-heading font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {site?.name || t('home.defaultHeroTitle')}
            </h1>
            <p className="mt-6 max-w-xl break-words text-lg leading-relaxed text-neutral-400">
              {homeContent.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              {user ? (
                <Link to="/dashboard" className="px-7 py-3 rounded-lg bg-white text-neutral-900 font-medium text-sm hover:bg-neutral-200 transition-colors">
                  {t('home.goToDashboard')} →
                </Link>
              ) : (
                <>
                  <Link to="/register" className="px-7 py-3 rounded-lg bg-white text-neutral-900 font-medium text-sm hover:bg-neutral-200 transition-colors">
                    {t('home.getStarted')} →
                  </Link>
                  <Link to="/pricing" className="px-7 py-3 text-neutral-400 font-medium text-sm hover:text-white transition-colors">
                    {t('home.viewPricing')}
                  </Link>
                </>
              )}
            </div>

            {homeContent.heroImage && (
              <HomeHeroImage src={homeContent.heroImage} alt={site?.name} variant="dark" className="mt-12 aspect-[16/7]" />
            )}
          </div>
        </FadeContent>

        {/* Stats — simple inline */}
        <FadeContent blur duration={800} delay={400}>
          <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-neutral-800 pt-6 sm:mt-20 sm:gap-5 sm:pt-10">
            <div className="min-w-0">
              <div className="text-xl font-bold text-white sm:text-2xl">
                {enabledModels.length}
              </div>
              <p className="mt-0.5 truncate text-xs text-neutral-500 sm:text-sm">{t('home.aiModels')}</p>
            </div>
            <div className="min-w-0 border-l border-neutral-800 pl-3 sm:pl-5">
              <div className="text-xl font-bold text-white sm:text-2xl">
                {visiblePackageCount}
              </div>
              <p className="mt-0.5 truncate text-xs text-neutral-500 sm:text-sm">{t('home.plansPackages')}</p>
            </div>
            <div className="min-w-0 border-l border-neutral-800 pl-3 sm:pl-5">
              <div className="text-xl font-bold text-white sm:text-2xl">
                {PUBLIC_API_ENDPOINT_COUNT}
              </div>
              <p className="mt-0.5 truncate text-xs text-neutral-500 sm:text-sm">{t('home.apiEndpointsTitle')}</p>
            </div>
          </div>
        </FadeContent>
      </section>

      <ApiEndpoints variant="minimal" />

      {/* Features — two-column layout */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <FadeContent blur duration={800} delay={100}>
          <h2 className="text-2xl font-heading font-bold text-white mb-2">{t('home.whyChooseUs')}</h2>
          <p className="text-neutral-500 mb-10">{t('home.whyChooseUsDesc')}</p>

          <div className="space-y-6">
            {[
              { title: t('home.lightningFast'), desc: t('home.lightningFastDesc') },
              { title: t('home.securePrivate'), desc: t('home.securePrivateDesc') },
              { title: t('home.payAsYouGo'), desc: t('home.payAsYouGoDesc') },
            ].map((f, i) => (
              <div key={i} className="flex gap-6 items-start py-6 border-b border-neutral-800/60 last:border-0 group">
                <span className="text-sm font-mono text-neutral-600 mt-0.5">0{i + 1}</span>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1 group-hover:text-neutral-300 transition-colors">{f.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed max-w-lg">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeContent>
      </section>

      {/* Models — simple list */}
      {enabledModels.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-20">
          <FadeContent blur duration={800} delay={100}>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-2xl font-heading font-bold text-white mb-2">{t('home.availableModels')}</h2>
                <p className="text-neutral-500">{t('home.availableModelsDesc', { count: enabledModels.length })}</p>
              </div>
              {enabledModels.length > 8 && (
                <Link to="/pricing" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  {t('home.viewAllModels', { count: enabledModels.length })} →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {enabledModels.slice(0, 8).map((m, i) => (
                <div key={m.id || i} className="min-w-0 rounded-lg border border-neutral-800/60 px-4 py-3 transition-colors hover:border-neutral-700">
                  <span className="block truncate font-mono text-sm text-neutral-300">{m.display_name || m.model_name}</span>
                </div>
              ))}
            </div>
          </FadeContent>
        </section>
      )}

      {/* Packages — clean cards */}
      {packages.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-20">
          <FadeContent blur duration={800} delay={100}>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">{t('home.plansPackages')}</h2>
            <p className="text-neutral-500 mb-10">{t('home.choosePlan')}</p>

            <div className="grid md:grid-cols-3 gap-4 max-w-4xl">
              {packages.filter(p => p.enabled).slice(0, 3).map((pkg) => {
                const quotaDollars = pkg.quota_amount > 0 ? pkg.quota_amount / Q : 0;
                const rp = pkg.quota_reset_period || 'never';
                let tqd = quotaDollars;
                if (rp !== 'never' && pkg.duration > 0 && quotaDollars > 0) {
                  let n = rp === 'daily' ? pkg.duration : rp === 'weekly' ? Math.floor(pkg.duration / 7) : rp === 'monthly' ? Math.floor(pkg.duration / 30) : 1;
                  if (n < 1) n = 1;
                  tqd = quotaDollars * n;
                }
                const equiv = calcOfficialEquivList(enabledModels, tqd);
                return (
                <div key={pkg.id} className="rounded-xl p-6 flex flex-col border border-neutral-800/60 hover:border-neutral-700 transition-colors">
                  <h3 className="break-words text-base font-semibold text-white">{pkg.name}</h3>
                  {pkg.description && <p className="mt-1 break-words text-sm text-neutral-500">{pkg.description}</p>}
                  <div className="mt-auto pt-6">
                    <span className="text-3xl font-bold text-white">{fmtCNY(pkg.price)}</span>
                    {pkg.original_price > pkg.price && (
                      <span className="text-sm text-neutral-600 line-through ml-2">{fmtCNY(pkg.original_price)}</span>
                    )}
                    {pkg.duration > 0 && <p className="text-xs text-neutral-600 mt-1">{t('home.days', { count: pkg.duration })}</p>}
                  </div>
                  {equiv.length > 0 && (
                    <p className="text-xs text-amber-300/80 mt-2">🔥 <RotatingEquiv items={equiv} text={(item) => t('packages.officialEquiv', { model: item.label, amount: item.equivDollars })} /></p>
                  )}
                  <Link to={user ? '/packages' : '/register'} className="mt-4 py-2.5 rounded-lg bg-neutral-800 text-white font-medium text-sm text-center hover:bg-neutral-700 transition-colors">
                    {user ? t('home.subscribe') : t('home.getStarted')}
                  </Link>
                </div>
              )})}
            </div>
          </FadeContent>
        </section>
      )}

      {/* CTA — simple */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <FadeContent blur duration={800} delay={100}>
          <div className="border-t border-neutral-800 pt-16 text-center">
            <h2 className="text-2xl font-heading font-bold text-white mb-3">{t('home.readyToStart')}</h2>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">{t('home.readyToStartDesc')}</p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              {user ? (
                <Link to="/dashboard" className="px-7 py-3 rounded-lg bg-white text-neutral-900 font-medium text-sm hover:bg-neutral-200 transition-colors">
                  {t('home.goToDashboard')} →
                </Link>
              ) : (
                <>
                  <Link to="/register" className="px-7 py-3 rounded-lg bg-white text-neutral-900 font-medium text-sm hover:bg-neutral-200 transition-colors">
                    {t('home.createFreeAccount')} →
                  </Link>
                  <Link to="/login" className="px-7 py-3 text-neutral-400 font-medium text-sm hover:text-white transition-colors">
                    {t('home.signIn')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </FadeContent>
      </section>
    </div>
  );
}
