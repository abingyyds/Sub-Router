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

export default function DefaultHome() {
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
      {/* Subtle gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      {/* Hero — centered, editorial */}
      <section className="relative max-w-5xl mx-auto px-6 pt-32 pb-20">
        <FadeContent blur duration={800} delay={100}>
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-heading font-extrabold text-white leading-[1.08] tracking-tight">
              {site?.name || t('home.defaultHeroTitle')}
            </h1>
            <p className="text-lg text-neutral-400 mt-6 leading-relaxed max-w-xl mx-auto">
              {t('home.heroSubtitle')}
            </p>

            <div className="flex items-center justify-center gap-4 mt-10">
              {user ? (
                <Link to="/dashboard" className="px-8 py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-neutral-100 transition-all">
                  {t('home.goToDashboard')}
                </Link>
              ) : (
                <>
                  <Link to="/register" className="px-8 py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-neutral-100 transition-all">
                    {t('home.getStarted')}
                  </Link>
                  <Link to="/pricing" className="px-8 py-3.5 rounded-2xl border border-white/15 text-white font-medium text-sm hover:bg-white/5 transition-all">
                    {t('home.viewPricing')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </FadeContent>

        {/* Stats */}
        <FadeContent blur duration={800} delay={400}>
          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto mt-24">
            {[
              { value: enabledModels.length || 50, suffix: '+', label: t('home.aiModels') },
              { value: 99.9, suffix: '%', label: t('home.uptime') },
              { value: 50, suffix: 'ms', label: t('home.latency'), prefix: '<' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-2xl font-bold text-white">
                  {stat.prefix}<CountUp from={0} to={stat.value} duration={2} />{stat.suffix}
                </div>
                <p className="text-sm text-neutral-500 mt-1">{stat.label}</p>
              </div>
            ))}
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
              { title: t('home.lightningFast'), desc: t('home.lightningFastDesc'), color: 'violet', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )},
              { title: t('home.securePrivate'), desc: t('home.securePrivateDesc'), color: 'blue', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )},
              { title: t('home.payAsYouGo'), desc: t('home.payAsYouGoDesc'), color: 'cyan', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )},
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                <div className={`w-10 h-10 rounded-lg bg-${f.color}-500/10 text-${f.color}-400 flex items-center justify-center mb-4`}>
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
                <Link to="/pricing" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  {t('home.viewAllModels', { count: enabledModels.length })} →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {enabledModels.slice(0, 8).map((m, i) => (
                <div key={m.id || i} className="px-4 py-3 rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-colors">
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
                <div key={pkg.id} className={`rounded-2xl p-6 flex flex-col border transition-colors ${
                  i === 1 ? 'bg-white/[0.04] border-white/[0.12]' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                }`}>
                  {i === 1 && <span className="text-xs text-violet-400 font-medium mb-2 uppercase tracking-wider">{t('home.popular') || 'Popular'}</span>}
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
                  <Link to={user ? '/packages' : '/register'} className={`mt-4 py-2.5 rounded-xl font-medium text-sm text-center transition-colors ${
                    i === 1
                      ? 'bg-white text-black hover:bg-neutral-100'
                      : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'
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
          <div className="border-t border-white/[0.06] pt-16 text-center">
            <h2 className="text-2xl font-heading font-bold text-white mb-3">{t('home.readyToStart')}</h2>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">{t('home.readyToStartDesc')}</p>
            <div className="flex items-center justify-center gap-4">
              {user ? (
                <Link to="/dashboard" className="px-8 py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-neutral-100 transition-all">
                  {t('home.goToDashboard')}
                </Link>
              ) : (
                <>
                  <Link to="/register" className="px-8 py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-neutral-100 transition-all">
                    {t('home.createFreeAccount')}
                  </Link>
                  <Link to="/login" className="px-8 py-3.5 rounded-2xl border border-white/15 text-white font-medium text-sm hover:bg-white/5 transition-all">
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
