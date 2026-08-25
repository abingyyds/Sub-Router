import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ShieldCheck, WalletCards, Zap } from 'lucide-react';
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

export default function CorporateHome() {
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

  const enabledModels = models.filter(m => m.enabled !== false);
  const visiblePackageCount = packages.filter(p => p.enabled).length;
  const homeContent = getHomeContent(site, t);

  return (
    <div>
      {/* Hero — left-aligned, formal */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-20 lg:pt-32">
        <FadeContent blur duration={800} delay={100}>
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {homeContent.heroTagline}
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {site?.name || t('home.defaultHeroTitle')}
            </h1>
            <p className="text-lg text-slate-500 mt-6 leading-relaxed max-w-xl">
              {homeContent.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              {user ? (
                <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                  {t('home.goToDashboard')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                    {t('home.getStarted')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/pricing" className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                    {t('home.viewPricing')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>

            {homeContent.heroImage && (
              <HomeHeroImage src={homeContent.heroImage} alt={site?.name} className="mt-12 aspect-[16/7]" />
            )}
          </div>
        </FadeContent>

        {/* Stats — horizontal bar */}
        <FadeContent blur duration={800} delay={400}>
          <div className="mt-12 grid max-w-xl grid-cols-3 border-t border-slate-200 pt-6 sm:mt-20 sm:pt-10">
            <div className="min-w-0 px-2 first:pl-0 sm:px-6 sm:first:pl-0">
              <div className="text-lg font-bold text-slate-900 sm:text-2xl">
                {enabledModels.length}
              </div>
              <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">{t('home.aiModels')}</p>
            </div>
            <div className="min-w-0 border-l border-slate-200 px-2 sm:px-6">
              <div className="text-lg font-bold text-slate-900 sm:text-2xl">
                {visiblePackageCount}
              </div>
              <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">{t('home.plansPackages')}</p>
            </div>
            <div className="min-w-0 border-l border-slate-200 px-2 pr-0 sm:px-6 sm:pr-0">
              <div className="text-lg font-bold text-slate-900 sm:text-2xl">
                {PUBLIC_API_ENDPOINT_COUNT}
              </div>
              <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">{t('home.apiEndpointsTitle')}</p>
            </div>
          </div>
        </FadeContent>
      </section>

      <ApiEndpoints variant="corporate" />

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <FadeContent blur duration={800} delay={100}>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('home.whyChooseUs')}</h2>
            <p className="text-slate-500 mb-10">{t('home.whyChooseUsDesc')}</p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: t('home.lightningFast'), desc: t('home.lightningFastDesc'), icon: Zap },
                { title: t('home.securePrivate'), desc: t('home.securePrivateDesc'), icon: ShieldCheck },
                { title: t('home.payAsYouGo'), desc: t('home.payAsYouGoDesc'), icon: WalletCards },
              ].map((f, i) => (
                <div key={i} className="p-6 rounded-xl bg-white border border-slate-200 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </FadeContent>
        </div>
      </section>

      {/* Models */}
      {enabledModels.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <FadeContent blur duration={800} delay={100}>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('home.availableModels')}</h2>
                <p className="text-slate-500">{t('home.availableModelsDesc', { count: enabledModels.length })}</p>
              </div>
              {enabledModels.length > 8 && (
                <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                  {t('home.viewAllModels', { count: enabledModels.length })}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {enabledModels.slice(0, 8).map((m, i) => (
                <div key={m.id || i} className="px-4 py-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <span className="text-sm text-slate-600 font-mono">{m.display_name || m.model_name}</span>
                </div>
              ))}
            </div>
          </FadeContent>
        </section>
      )}

      {/* Packages */}
      {packages.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <FadeContent blur duration={800} delay={100}>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('home.plansPackages')}</h2>
            <p className="text-slate-500 mb-10">{t('home.choosePlan')}</p>

            <div className="grid md:grid-cols-3 gap-5 max-w-4xl">
              {packages.filter(p => p.enabled).slice(0, 3).map((pkg, i) => {
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
                <div key={pkg.id} className={`rounded-xl p-6 flex flex-col border transition-all ${
                  i === 1 ? 'border-slate-900 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  {i === 1 && <span className="text-xs text-slate-900 font-semibold mb-2 uppercase tracking-wider">{t('home.popular') || 'Popular'}</span>}
                  <h3 className="text-base font-semibold text-slate-900">{pkg.name}</h3>
                  {pkg.description && <p className="text-sm text-slate-500 mt-1">{pkg.description}</p>}
                  <div className="mt-auto pt-6">
                    <span className="text-3xl font-bold text-slate-900">{fmtCNY(pkg.price)}</span>
                    {pkg.original_price > pkg.price && (
                      <span className="text-sm text-slate-500 line-through ml-2">{fmtCNY(pkg.original_price)}</span>
                    )}
                    {pkg.duration > 0 && <p className="text-xs text-slate-500 mt-1">{t('home.days', { count: pkg.duration })}</p>}
                  </div>
                  {equiv.length > 0 && (
                    <p className="mt-2 text-xs font-medium text-amber-700"><RotatingEquiv items={equiv} text={(item) => t('packages.officialEquiv', { model: item.label, amount: item.equivDollars })} /></p>
                  )}
                  <Link to={user ? '/packages' : '/register'} className={`mt-4 py-2.5 rounded-lg font-medium text-sm text-center transition-colors ${
                    i === 1
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}>
                    {user ? t('home.subscribe') : t('home.getStarted')}
                  </Link>
                </div>
              )})}
            </div>
          </FadeContent>
        </section>
      )}

      {/* CTA */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <FadeContent blur duration={800} delay={100}>
            <h2 className="text-2xl font-bold text-white mb-3">{t('home.readyToStart')}</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">{t('home.readyToStartDesc')}</p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              {user ? (
                <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100">
                  {t('home.goToDashboard')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100">
                    {t('home.createFreeAccount')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/login" className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
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
