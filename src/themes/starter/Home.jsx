import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSite, useCurrency } from '../../context/SiteContext';
import { getSiteModels, getSitePackages, Q } from '../../api';
import { calcOfficialEquivList } from '../../utils/officialEquiv';
import RotatingEquiv from '../../components/bits/RotatingEquiv';
import CountUp from '../../components/bits/CountUp';
import FadeContent from '../../components/bits/FadeContent';
import ApiEndpoints from '../../components/ApiEndpoints';

export default function StarterHome() {
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

  return (
    <div className="relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-radial from-brand-600/15 to-transparent blur-3xl opacity-60" />
      </div>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-32 pb-20">
        <FadeContent blur duration={800} delay={100}>
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-medium text-brand-400 mb-4 tracking-wide uppercase">{t('home.heroTagline') || 'AI API Platform'}</p>
            <h1 className="text-5xl md:text-6xl font-heading font-bold text-white leading-[1.1] tracking-tight">
              {site?.name || t('home.defaultHeroTitle')}
            </h1>
            <p className="text-lg text-neutral-400 mt-6 leading-relaxed max-w-xl mx-auto">
              {t('home.heroSubtitle')}
            </p>

            <div className="flex items-center justify-center gap-4 mt-10">
              {user ? (
                <Link to="/dashboard" className="px-7 py-3 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-500 transition-colors shadow-lg shadow-brand-600/20">
                  {t('home.goToDashboard')} →
                </Link>
              ) : (
                <>
                  <Link to="/register" className="px-7 py-3 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-500 transition-colors shadow-lg shadow-brand-600/20">
                    {t('home.getStarted')}
                  </Link>
                  <Link to="/pricing" className="px-7 py-3 text-neutral-400 font-medium text-sm hover:text-white transition-colors">
                    {t('home.viewPricing')} →
                  </Link>
                </>
              )}
            </div>
          </div>
        </FadeContent>

        {/* Stats */}
        <FadeContent blur duration={800} delay={400}>
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-20 pt-10 border-t border-neutral-800/60">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                <CountUp from={0} to={enabledModels.length || 50} duration={2} />+
              </div>
              <p className="text-sm text-neutral-500 mt-0.5">{t('home.aiModels')}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                <CountUp from={0} to={99.9} duration={2.5} />%
              </div>
              <p className="text-sm text-neutral-500 mt-0.5">{t('home.uptime')}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                &lt;<CountUp from={200} to={50} duration={2} direction="down" />ms
              </div>
              <p className="text-sm text-neutral-500 mt-0.5">{t('home.latency')}</p>
            </div>
          </div>
        </FadeContent>
      </section>

      <ApiEndpoints />

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <FadeContent blur duration={800} delay={100}>
          <div className="text-center mb-14">
            <h2 className="text-2xl font-heading font-bold text-white mb-3">{t('home.whyChooseUs')}</h2>
            <p className="text-neutral-500">{t('home.whyChooseUsDesc')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: t('home.lightningFast'), desc: t('home.lightningFastDesc'), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )},
              { title: t('home.securePrivate'), desc: t('home.securePrivateDesc'), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )},
              { title: t('home.payAsYouGo'), desc: t('home.payAsYouGoDesc'), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )},
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-xl border border-neutral-800/60 hover:border-brand-500/25 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </FadeContent>
      </section>

      {/* Models */}
      {enabledModels.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-20">
          <FadeContent blur duration={800} delay={100}>
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-heading font-bold text-white mb-2">{t('home.availableModels')}</h2>
                <p className="text-neutral-500">{t('home.availableModelsDesc', { count: enabledModels.length })}</p>
              </div>
              {enabledModels.length > 8 && (
                <Link to="/pricing" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                  {t('home.viewAllModels', { count: enabledModels.length })} →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {enabledModels.slice(0, 8).map((m, i) => (
                <div key={m.id || i} className="px-4 py-3 rounded-lg border border-neutral-800/60 hover:border-neutral-700 transition-colors">
                  <span className="text-sm text-neutral-300 font-mono">{m.display_name || m.model_name}</span>
                </div>
              ))}
            </div>
          </FadeContent>
        </section>
      )}

      {/* Packages */}
      {packages.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-20">
          <FadeContent blur duration={800} delay={100}>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">{t('home.plansPackages')}</h2>
            <p className="text-neutral-500 mb-10">{t('home.choosePlan')}</p>

            <div className="grid md:grid-cols-3 gap-4 max-w-4xl">
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
                <div key={pkg.id} className={`rounded-xl p-6 flex flex-col border transition-colors ${
                  i === 1 ? 'border-brand-500/30 bg-brand-500/[0.04]' : 'border-neutral-800/60 hover:border-neutral-700'
                }`}>
                  {i === 1 && <span className="text-xs text-brand-400 font-medium mb-2 uppercase tracking-wider">{t('home.popular') || 'Popular'}</span>}
                  <h3 className="text-base font-semibold text-white">{pkg.name}</h3>
                  {pkg.description && <p className="text-sm text-neutral-500 mt-1">{pkg.description}</p>}
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
                  <Link to={user ? '/packages' : '/register'} className={`mt-4 py-2.5 rounded-lg font-medium text-sm text-center transition-colors ${
                    i === 1
                      ? 'bg-brand-600 text-white hover:bg-brand-500'
                      : 'bg-neutral-800 text-white hover:bg-neutral-700'
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
      <section className="max-w-5xl mx-auto px-6 py-24">
        <FadeContent blur duration={800} delay={100}>
          <div className="border-t border-neutral-800 pt-16 text-center">
            <h2 className="text-2xl font-heading font-bold text-white mb-3">{t('home.readyToStart')}</h2>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">{t('home.readyToStartDesc')}</p>
            <div className="flex items-center justify-center gap-4">
              {user ? (
                <Link to="/dashboard" className="px-7 py-3 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-500 transition-colors shadow-lg shadow-brand-600/20">
                  {t('home.goToDashboard')} →
                </Link>
              ) : (
                <>
                  <Link to="/register" className="px-7 py-3 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-500 transition-colors shadow-lg shadow-brand-600/20">
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
