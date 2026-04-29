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

export default function AIHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { site } = useSite();
  const { symbol } = useCurrency();
  const [models, setModels] = useState([]);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    getSiteModels().then(r => { if (r.data.success) setModels(r.data.data || []); }).catch(() => { });
    getSitePackages().then(r => { if (r.data.success) setPackages(r.data.data || []); }).catch(() => { });
  }, []);

  const enabledModels = models.filter(m => m.enabled !== false);
  const apiBase = (typeof window !== 'undefined' ? window.location.origin : 'https://api.example.com');

  return (
    <div className="relative overflow-hidden">
      {/* Background grid + glow */}
      <div className="absolute inset-x-0 top-0 h-[720px] pointer-events-none -z-0">
        <div className="absolute inset-0 ai-grid-bg" />
        <div
          className="ai-hero-glow absolute left-1/2 top-[-120px] w-[1100px] h-[640px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, rgba(37,99,235,0.22), rgba(14,165,233,0.10) 55%, transparent 75%)',
          }}
        />
      </div>

      {/* ─────────── Hero ─────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-14 md:pt-28 pb-12 md:pb-20">
        <FadeContent blur duration={800} delay={100}>
          <div className="text-center max-w-3xl mx-auto">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-blue-100 shadow-sm shadow-blue-500/5 mb-7">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-slate-600 tracking-wide">
                {t('home.heroTagline') || 'OpenAI · Anthropic · Google · DeepSeek · 全模型聚合'}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-heading font-bold leading-[1.08] tracking-tight">
              <span className="text-slate-900">{site?.name || t('home.defaultHeroTitle')}</span>
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500">
                {t('home.heroSubtitle')?.split(' ').slice(0, 4).join(' ') || 'One API · All Models'}
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-500 mt-6 leading-relaxed max-w-2xl mx-auto">
              {t('home.heroSubtitle')}
            </p>

            <div className="flex items-center justify-center gap-3 mt-9 flex-wrap">
              {user ? (
                <Link
                  to="/dashboard"
                  className="btn-shine cta-glow group inline-flex items-center gap-1.5 px-7 py-3 rounded-xl text-white font-medium text-sm transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)' }}
                >
                  <span>{t('home.goToDashboard')}</span>
                  <span className="arrow-nudge">→</span>
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-shine cta-glow group inline-flex items-center gap-1.5 px-7 py-3 rounded-xl text-white font-medium text-sm transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                    style={{ backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)' }}
                  >
                    <span>{t('home.getStarted')}</span>
                    <span className="arrow-nudge">→</span>
                  </Link>
                  <Link
                    to="/pricing"
                    className="px-7 py-3 rounded-xl text-slate-700 font-medium text-sm bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm transition-all"
                  >
                    {t('home.viewPricing')}
                  </Link>
                </>
              )}
            </div>

            {/* Quick "compatible with OpenAI SDK" hint */}
            <p className="text-xs text-slate-400 mt-6 tracking-wide">
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {t('home.openaiCompatible') || 'OpenAI SDK Compatible'}
              </span>
              <span className="mx-3 text-slate-300">·</span>
              <span>{t('home.streaming') || 'Streaming · Function Calling · Vision'}</span>
            </p>
          </div>
        </FadeContent>

        {/* Code preview card */}
        <FadeContent blur duration={800} delay={300}>
          <div className="mt-10 md:mt-14 max-w-3xl mx-auto">
            <div className="relative rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-xl shadow-blue-500/5 overflow-hidden">
              {/* window chrome */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 bg-slate-50/50">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-300" />
                  <span className="w-3 h-3 rounded-full bg-amber-300" />
                  <span className="w-3 h-3 rounded-full bg-emerald-300" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 tracking-wide">curl · chat/completions</span>
                <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 200 OK
                </span>
              </div>
              <pre className="px-5 py-5 text-[13px] font-mono leading-relaxed text-slate-700 overflow-x-auto">
                {`curl ${apiBase}/v1/chat/completions \\
  -H "Authorization: Bearer `}<span className="text-blue-600">sk-xxxxxxxx</span>{`" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "`}<span className="text-sky-600">gpt-4o</span>{`",
    "messages": [{ "role": "user", "content": "Hello!" }],
    "stream": `}<span className="text-indigo-600">true</span>{`
  }'`}
              </pre>
            </div>
          </div>
        </FadeContent>

        {/* Stats */}
        <FadeContent blur duration={800} delay={500}>
          <div className="grid grid-cols-3 gap-3 md:gap-8 max-w-2xl mx-auto mt-10 md:mt-16">
            <Stat label={t('home.aiModels')} value={
              <><CountUp from={0} to={enabledModels.length || 50} duration={2} />+</>
            } />
            <Stat label={t('home.uptime')} value={
              <><CountUp from={0} to={99.9} duration={2.5} />%</>
            } />
            <Stat label={t('home.latency')} value={
              <>&lt;<CountUp from={200} to={50} duration={2} direction="down" />ms</>
            } />
          </div>
        </FadeContent>
      </section>

      {/* ─────────── Features ─────────── */}
      <section className="relative max-w-6xl mx-auto px-6 py-12 md:py-20">
        <FadeContent blur duration={800} delay={100}>
          <div className="text-center mb-9 md:mb-14">
            <p className="text-xs font-semibold text-blue-600 tracking-[0.2em] uppercase mb-3">Features</p>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-3">{t('home.whyChooseUs')}</h2>
            <p className="text-slate-500 max-w-xl mx-auto">{t('home.whyChooseUsDesc')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-3 md:gap-4">
            <FeatureCard
              tone="blue"
              title={t('home.lightningFast')}
              desc={t('home.lightningFastDesc')}
              icon={(
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            />
            <FeatureCard
              tone="indigo"
              title={t('home.securePrivate')}
              desc={t('home.securePrivateDesc')}
              icon={(
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            />
            <FeatureCard
              tone="sky"
              title={t('home.payAsYouGo')}
              desc={t('home.payAsYouGoDesc')}
              icon={(
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            />
          </div>
        </FadeContent>
      </section>

      {/* ─────────── Models ─────────── */}
      {enabledModels.length > 0 && (
        <section className="relative max-w-6xl mx-auto px-6 py-12 md:py-20">
          <FadeContent blur duration={800} delay={100}>
            <div className="flex items-end justify-between mb-7 md:mb-10 flex-wrap gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 tracking-[0.2em] uppercase mb-3">Models</p>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-2">{t('home.availableModels')}</h2>
                <p className="text-slate-500">{t('home.availableModelsDesc', { count: enabledModels.length })}</p>
              </div>
              {enabledModels.length > 12 && (
                <Link to="/pricing" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1">
                  {t('home.viewAllModels', { count: enabledModels.length })}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {enabledModels.slice(0, 12).map((m, i) => (
                <div
                  key={m.id || i}
                  className="group relative px-4 py-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/10 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 shrink-0" />
                    <span className="text-sm text-slate-700 font-mono truncate">{m.display_name || m.model_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeContent>
        </section>
      )}

      {/* ─────────── Packages ─────────── */}
      {packages.length > 0 && (
        <section className="relative max-w-6xl mx-auto px-6 py-12 md:py-20">
          <FadeContent blur duration={800} delay={100}>
            <div className="text-center mb-8 md:mb-12">
              <p className="text-xs font-semibold text-blue-600 tracking-[0.2em] uppercase mb-3">Pricing</p>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-2">{t('home.plansPackages')}</h2>
              <p className="text-slate-500">{t('home.choosePlan')}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
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
                const popular = i === 1;
                return (
                  <div
                    key={pkg.id}
                    className={`relative rounded-2xl p-6 flex flex-col transition-all ${popular
                      ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/30 -translate-y-2'
                      : 'bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5'
                      }`}
                  >
                    {popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-amber-900 text-[11px] font-semibold uppercase tracking-wider shadow-sm">
                        {t('home.popular') || 'Popular'}
                      </span>
                    )}
                    <h3 className={`text-lg font-semibold ${popular ? 'text-white' : 'text-slate-900'}`}>{pkg.name}</h3>
                    {pkg.description && (
                      <p className={`text-sm mt-1.5 ${popular ? 'text-blue-100' : 'text-slate-500'}`}>{pkg.description}</p>
                    )}
                    <div className="mt-6 mb-2">
                      <span className={`text-4xl font-bold ${popular ? 'text-white' : 'text-slate-900'}`}>
                        {symbol}{Number(pkg.price).toFixed(2)}
                      </span>
                      {pkg.original_price > pkg.price && (
                        <span className={`text-sm line-through ml-2 ${popular ? 'text-blue-200' : 'text-slate-400'}`}>
                          {symbol}{Number(pkg.original_price).toFixed(2)}
                        </span>
                      )}
                      {pkg.duration > 0 && (
                        <p className={`text-xs mt-1 ${popular ? 'text-blue-100' : 'text-slate-500'}`}>{t('home.days', { count: pkg.duration })}</p>
                      )}
                    </div>
                    {equiv.length > 0 && (
                      <p className={`text-xs mt-1 ${popular ? 'text-amber-200' : 'text-amber-600'}`}>
                        🔥 <RotatingEquiv items={equiv} text={(item) => t('packages.officialEquiv', { model: item.label, amount: item.equivDollars })} />
                      </p>
                    )}
                    <Link
                      to={user ? '/packages' : '/register'}
                      className={`mt-auto pt-6`}
                    >
                      <span className={`block py-2.5 rounded-xl font-medium text-sm text-center transition-all ${popular
                        ? 'bg-white text-blue-700 hover:bg-blue-50'
                        : 'bg-slate-900 text-white hover:bg-blue-600'
                        }`}>
                        {user ? t('home.subscribe') : t('home.getStarted')}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </FadeContent>
        </section>
      )}

      {/* ─────────── CTA ─────────── */}
      <section className="relative max-w-6xl mx-auto px-6 py-14 md:py-24">
        <FadeContent blur duration={800} delay={100}>
          <div
            className="relative overflow-hidden rounded-3xl p-8 md:p-16 text-center"
            style={{
              backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 45%, #0ea5e9 100%)',
            }}
          >
            <div className="absolute inset-0 ai-grid-bg opacity-30" />
            <div className="relative">
              <h2 className="text-2xl md:text-4xl font-heading font-bold text-white mb-4">
                {t('home.readyToStart')}
              </h2>
              <p className="text-blue-100 mb-8 max-w-md mx-auto">{t('home.readyToStartDesc')}</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {user ? (
                  <Link to="/dashboard" className="px-7 py-3 rounded-xl bg-white text-blue-700 font-medium text-sm hover:bg-blue-50 transition-colors shadow-lg">
                    {t('home.goToDashboard')} →
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="px-7 py-3 rounded-xl bg-white text-blue-700 font-medium text-sm hover:bg-blue-50 transition-colors shadow-lg">
                      {t('home.createFreeAccount')} →
                    </Link>
                    <Link to="/login" className="px-7 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 backdrop-blur transition-colors border border-white/20">
                      {t('home.signIn')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </FadeContent>
      </section>
    </div>
  );
}

/* ───────── helpers ───────── */

function Stat({ label, value }) {
  return (
    <div className="text-center px-2 sm:px-4 py-4 sm:py-5 rounded-2xl bg-white/60 backdrop-blur border border-slate-200/60 shadow-sm">
      <div className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-sky-500">
        {value}
      </div>
      <p className="text-[11px] sm:text-xs md:text-sm text-slate-500 mt-1 tracking-wide">{label}</p>
    </div>
  );
}

const TONES = {
  blue: { iconBg: 'bg-blue-50', iconText: 'text-blue-600', ring: 'group-hover:border-blue-300' },
  indigo: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-600', ring: 'group-hover:border-indigo-300' },
  sky: { iconBg: 'bg-sky-50', iconText: 'text-sky-600', ring: 'group-hover:border-sky-300' },
};

function FeatureCard({ tone = 'blue', title, desc, icon }) {
  const c = TONES[tone] || TONES.blue;
  return (
    <div
      className={`group relative p-4 md:p-6 rounded-2xl bg-white border border-slate-200/80 ${c.ring} hover:shadow-lg hover:shadow-blue-500/5 transition-all
                  flex md:block items-start gap-4`}
    >
      {/* Icon — sits left on mobile, on top from md */}
      <div
        className={`w-10 h-10 md:w-11 md:h-11 rounded-xl ${c.iconBg} ${c.iconText}
                    flex items-center justify-center shrink-0 mb-0 md:mb-4
                    transition-transform group-hover:scale-110`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] md:text-base font-semibold text-slate-900 mb-1 md:mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-[13px] md:text-sm text-slate-500 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}
