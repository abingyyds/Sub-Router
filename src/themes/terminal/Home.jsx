import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Cpu, KeyRound, LockKeyhole, RadioTower, ShieldCheck, TerminalSquare, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite, useCurrency } from '../../context/SiteContext';
import { calcOfficialEquivList } from '../../utils/officialEquiv';
import { packageQuotaDollars, useHomeData } from '../shared/useHomeData';
import DecryptedText from '../../components/bits/DecryptedText';
import ShinyText from '../../components/bits/ShinyText';
import CountUp from '../../components/bits/CountUp';
import FadeContent from '../../components/bits/FadeContent';
import RotatingEquiv from '../../components/bits/RotatingEquiv';
import ApiEndpoints from '../../components/ApiEndpoints';
import { getHomeContent } from '../../utils/siteContent';
import HomeHeroImage from '../shared/HomeHeroImage';

export default function TerminalHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { site } = useSite();
  const { fmtCNY } = useCurrency();
  const { enabledModels, visiblePackages } = useHomeData();
  const previewModels = enabledModels.slice(0, 7);
  const homeContent = getHomeContent(site, t);

  return (
    <div className="relative overflow-hidden bg-[#050807] text-emerald-50">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(52,211,153,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,.45)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,.22),transparent_40%),linear-gradient(180deg,transparent,rgba(5,8,7,.9)_75%)]" />

      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[0.96fr_1.04fr] lg:items-center lg:pb-20 lg:pt-20">
        <FadeContent blur duration={700} delay={80}>
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
              <TerminalSquare className="h-4 w-4" />
              <ShinyText text={homeContent.heroTagline} color="#a7f3d0" shineColor="#ffffff" speed={3} />
            </div>

            <h1 className="font-mono text-4xl font-black tracking-tight text-emerald-50 sm:text-5xl lg:text-6xl">
              <DecryptedText
                text={site?.name || t('home.defaultHeroTitle')}
                animateOn="view"
                speed={28}
                maxIterations={14}
                sequential
                revealDirection="start"
                encryptedClassName="text-emerald-500"
              />
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-emerald-100/70 sm:text-lg">
              {homeContent.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TerminalButton to={user ? '/dashboard' : '/register'}>
                {user ? t('home.goToDashboard') : t('home.getStarted')}
              </TerminalButton>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] px-6 py-3 font-mono text-sm font-bold text-emerald-100 transition-colors hover:bg-emerald-400/10"
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
            <HomeHeroImage src={homeContent.heroImage} alt={site?.name} variant="dark" className="aspect-[4/3]" />
          ) : (
            <RouteConsole models={previewModels} t={t} />
          )}
        </FadeContent>
      </section>

      <ApiEndpoints />

      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionTitle title={t('home.whyChooseUs')} desc={t('home.whyChooseUsDesc')} />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, title: t('home.lightningFast'), desc: t('home.lightningFastDesc') },
            { icon: ShieldCheck, title: t('home.securePrivate'), desc: t('home.securePrivateDesc') },
            { icon: LockKeyhole, title: t('home.payAsYouGo'), desc: t('home.payAsYouGoDesc') },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.035] p-6 transition-colors hover:border-emerald-400/35">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-400/25 bg-black/30 text-emerald-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-mono text-base font-black text-emerald-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-100/62">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {enabledModels.length > 0 && (
        <section className="relative border-y border-emerald-400/15 bg-black/20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionTitle title={t('home.availableModels')} desc={t('home.availableModelsDesc', { count: enabledModels.length })} />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {enabledModels.slice(0, 8).map((model, index) => (
                <div key={model.id || index} className="rounded-lg border border-emerald-400/15 bg-[#07110d] p-4 font-mono transition-colors hover:border-emerald-400/35">
                  <div className="mb-3 flex items-center justify-between">
                    <Cpu className="h-4 w-4 text-emerald-300" />
                    <span className="text-[10px] font-black text-emerald-400">READY</span>
                  </div>
                  <p className="truncate text-sm font-bold text-emerald-50">{model.display_name || model.model_name}</p>
                  <p className="mt-2 text-xs text-emerald-100/45">route.auto=true</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {visiblePackages.length > 0 && (
        <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionTitle title={t('home.plansPackages')} desc={t('home.choosePlan')} />
          <div className="grid gap-4 lg:grid-cols-3">
            {visiblePackages.slice(0, 3).map((pkg, index) => (
              <PackageCard key={pkg.id} pkg={pkg} index={index} models={enabledModels} fmtCNY={fmtCNY} t={t} user={user} />
            ))}
          </div>
        </section>
      )}

      <section className="relative border-t border-emerald-400/15 bg-emerald-400/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-mono text-2xl font-black text-emerald-50">{t('home.readyToStart')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/62">{t('home.readyToStartDesc')}</p>
          </div>
          <TerminalButton to={user ? '/dashboard' : '/register'}>
            {user ? t('home.goToDashboard') : t('home.createFreeAccount')}
          </TerminalButton>
        </div>
      </section>
    </div>
  );
}

function TerminalButton({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-6 py-3 font-mono text-sm font-black text-black shadow-lg shadow-emerald-400/15 transition-colors hover:bg-emerald-300">
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function Metric({ value, label, prefix = '', suffix = '' }) {
  return (
    <div className="rounded-lg border border-emerald-400/15 bg-black/25 p-4 font-mono">
      <div className="text-xl font-black text-emerald-200">{prefix}<CountUp from={0} to={value} duration={2} />{suffix}</div>
      <p className="mt-1 truncate text-xs font-bold text-emerald-100/45">{label}</p>
    </div>
  );
}

function SectionTitle({ title, desc }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h2 className="font-mono text-2xl font-black tracking-tight text-emerald-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-emerald-100/62">{desc}</p>
    </div>
  );
}

function RouteConsole({ models, t }) {
  const rows = models.length ? models : [{ display_name: 'gpt-4o-mini' }, { display_name: 'claude-sonnet' }, { display_name: 'gemini-pro' }];
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-[#030504] shadow-2xl shadow-emerald-950/60">
      <div className="flex items-center justify-between border-b border-emerald-400/15 px-4 py-3 font-mono">
        <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
          <RadioTower className="h-4 w-4" />
          subrouter-live
        </div>
        <span className="text-xs text-emerald-100/45">200 OK</span>
      </div>
      <div className="grid gap-0 lg:grid-cols-[1fr_0.92fr]">
        <div className="border-b border-emerald-400/15 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center gap-2 font-mono text-sm font-black text-emerald-50">
            <KeyRound className="h-4 w-4 text-emerald-300" />
            {t('nav.apiKeys')}
          </div>
          <pre className="overflow-hidden rounded-lg border border-emerald-400/10 bg-emerald-400/[0.04] p-4 font-mono text-xs leading-6 text-emerald-100/72">
{`$ curl /v1/chat/completions
> model=${rows[0]?.display_name || rows[0]?.model_name}
> strategy=latency_first
< routed=true
< fallback=armed`}
          </pre>
        </div>
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2 font-mono text-sm font-black text-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            {t('home.availableModels')}
          </div>
          <div className="space-y-2">
            {rows.slice(0, 5).map((model, index) => (
              <div key={model.id || index} className="flex items-center justify-between rounded-lg border border-emerald-400/10 bg-emerald-400/[0.035] px-3 py-2 font-mono">
                <span className="truncate text-xs text-emerald-100">{model.display_name || model.model_name}</span>
                <span className="ml-3 text-[10px] font-black text-emerald-400">UP</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageCard({ pkg, index, models, fmtCNY, t, user }) {
  const equiv = calcOfficialEquivList(models, packageQuotaDollars(pkg));
  const featured = index === 1;
  return (
    <div className={`flex min-h-[280px] flex-col rounded-lg border p-6 font-mono ${featured ? 'border-emerald-400/50 bg-emerald-400/[0.08]' : 'border-emerald-400/15 bg-black/20'}`}>
      {featured && <span className="mb-3 w-fit rounded bg-emerald-400 px-2 py-1 text-xs font-black uppercase tracking-wide text-black">{t('home.popular')}</span>}
      <h3 className="text-lg font-black text-emerald-50">{pkg.name}</h3>
      {pkg.description && <p className="mt-2 text-sm leading-6 text-emerald-100/55">{pkg.description}</p>}
      <div className="mt-auto pt-6">
        <span className="text-3xl font-black text-emerald-200">{fmtCNY(pkg.price)}</span>
        {pkg.original_price > pkg.price && <span className="ml-2 text-sm text-emerald-100/35 line-through">{fmtCNY(pkg.original_price)}</span>}
        {pkg.duration > 0 && <p className="mt-1 text-xs font-bold text-emerald-100/45">{t('home.days', { count: pkg.duration })}</p>}
        {equiv.length > 0 && (
          <p className="mt-3 text-xs font-bold text-amber-200">
            <RotatingEquiv items={equiv} text={(item) => t('packages.officialEquiv', { model: item.label, amount: item.equivDollars })} />
          </p>
        )}
      </div>
      <div className="mt-5">
        <TerminalButton to={user ? '/packages' : '/register'}>{user ? t('home.subscribe') : t('home.getStarted')}</TerminalButton>
      </div>
    </div>
  );
}
