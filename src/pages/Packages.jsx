import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getSitePackages, getSiteModels, subscribePackage, getActiveSubscriptions, Q } from '../api';
import { useCurrency } from '../context/SiteContext';
import SpotlightCard from '../components/bits/SpotlightCard';
import { calcOfficialEquivList } from '../utils/officialEquiv';
import RotatingEquiv from '../components/bits/RotatingEquiv';
import toast from 'react-hot-toast';

const resetLabelKeys = {
  never: 'packages.resetNever',
  daily: 'packages.resetDaily',
  weekly: 'packages.resetWeekly',
  monthly: 'packages.resetMonthly',
};

function formatDate(unix) {
  if (!unix) return '';
  return new Date(unix * 1000).toLocaleDateString();
}

export default function Packages() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { symbol, rate, fmtCNY } = useCurrency();
  const [packages, setPackages] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [activeSubs, setActiveSubs] = useState([]);

  const [confirmPkg, setConfirmPkg] = useState(null);

  const getResetLabel = (period) => t(resetLabelKeys[period] || resetLabelKeys.never);

  useEffect(() => {
    Promise.all([
      getSitePackages().then((r) => { if (r.data.success) setPackages(r.data.data || []); }).catch(() => {}),
      getSiteModels().then((r) => { if (r.data.success) setModels(r.data.data || []); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Load active subscriptions
  useEffect(() => {
    if (user) {
      getActiveSubscriptions()
        .then((r) => { if (r.data.success) setActiveSubs(r.data.data || []); })
        .catch(() => {});
    }
  }, [user]);

  const handleSubscribe = async (pkg) => {
    if (!user) {
      navigate('/register');
      return;
    }
    setConfirmPkg(pkg);
  };

  const confirmSubscribe = async () => {
    if (!confirmPkg) return;
    const pkgId = confirmPkg.id;
    setSubscribing(pkgId);
    try {
      const res = await subscribePackage(pkgId);
      if (res.data.success) {
        toast.success(t('packages.subscribedSuccess'));
        setConfirmPkg(null);
        // Background refresh errors shouldn't override a successful purchase toast.
        await refreshUser({ skipErrorHandler: true }).catch(() => null);
        const subsRes = await getActiveSubscriptions({
          skipErrorHandler: true,
        }).catch(() => null);
        if (subsRes?.data?.success) {
          setActiveSubs(subsRes.data.data || []);
        }
      } else {
        toast.error(res.data.message || t('common.requestFailed'));
      }
    } catch (e) {
      // Error already shown by axios interceptor
    }
    setSubscribing(null);
  };

  // Precompute official equivalents for each package
  const enabledModels = useMemo(() => models.filter((m) => m.enabled !== false), [models]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const enabled = packages.filter((p) => p.enabled);

  const spotlightColors = [
    'rgba(129,140,248,0.15)',
    'rgba(192,132,252,0.15)',
    'rgba(244,114,182,0.15)',
    'rgba(34,197,94,0.15)',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* ─── Hero with decorative illustration ─── */}
      <div className="relative mb-10 md:mb-14">
        {/* Soft glow backdrop */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-[640px] h-[280px] rounded-full blur-3xl opacity-60"
          style={{ background: 'radial-gradient(closest-side, rgba(37,99,235,0.18), rgba(14,165,233,0.08) 55%, transparent 75%)' }}
        />

        <div className="relative flex flex-col items-center text-center">
          <PackagesHeroArt />
          <span className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-page-link/10 text-page-link text-[11px] font-semibold tracking-[0.18em] uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Plans
          </span>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-page mb-3 tracking-tight">
            {t('packages.title')}
          </h1>
          <p className="text-sm md:text-base text-page-secondary max-w-xl">
            {t('packages.subtitle')}
          </p>
        </div>
      </div>

      {/* Active Subscriptions */}
      {activeSubs.length > 0 && (
        <div className="max-w-3xl mx-auto mb-10">
          <h2 className="text-lg font-semibold text-page mb-4">
            {t('packages.mySubscriptions')}
          </h2>
          <div className="space-y-3">
            {activeSubs.map((sub) => {
              const total = sub.amount_total || 0;
              const used = sub.amount_used || 0;
              const remain = Math.max(0, total - used);
              const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
              return (
                <div key={sub.id} className="glass rounded-xl p-4 border border-page-divider">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-page">
                      {t('packages.subscriptionId', { id: sub.id })}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-page-success border border-green-500/20">
                      {t('packages.active')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-page-secondary mb-3">
                    <span>{t('packages.expires')}: {formatDate(sub.end_time)}</span>
                    {sub.next_reset_time > 0 && (
                      <span>{t('packages.nextReset')}: {formatDate(sub.next_reset_time)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex-1 h-2 bg-page-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-page-secondary whitespace-nowrap">
                      {symbol}{(remain / Q * rate).toFixed(2)} / {symbol}{(total / Q * rate).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {enabled.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-10 px-6 glass rounded-3xl">
          <EmptyPackagesArt />
          <p className="text-base font-medium text-page mt-5 mb-1.5">
            {t('packages.noPackages')}
          </p>
          <p className="text-sm text-page-secondary mb-5">
            {t('packages.subtitle')}
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            style={{ backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)' }}
          >
            {t('packages.checkPricing')}
            <span className="arrow-nudge">→</span>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {enabled.map((pkg, i) => {
            const resetPeriod = pkg.quota_reset_period || 'never';
            const isSubscription = resetPeriod !== 'never';
            // For subscription packages, calculate TOTAL quota over the entire duration
            // e.g. daily reset + 30 day duration = 30x single-period quota
            const singleQuotaDollars = pkg.quota_amount > 0 ? pkg.quota_amount / Q : 0;
            let totalQuotaDollars = singleQuotaDollars;
            if (isSubscription && pkg.duration > 0 && singleQuotaDollars > 0) {
              let resetCount = 1;
              if (resetPeriod === 'daily') resetCount = pkg.duration;
              else if (resetPeriod === 'weekly') resetCount = Math.floor(pkg.duration / 7);
              else if (resetPeriod === 'monthly') resetCount = Math.floor(pkg.duration / 30);
              if (resetCount < 1) resetCount = 1;
              totalQuotaDollars = singleQuotaDollars * resetCount;
            }
            const equivList = calcOfficialEquivList(enabledModels, totalQuotaDollars);

            return (
            <div
              key={pkg.id}
              className="glass rounded-2xl flex flex-col"
            >
              <div className="p-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-page">{pkg.name}</h3>
                    {isSubscription && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-page-info border border-purple-500/20">
                        {getResetLabel(resetPeriod)}
                      </span>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-page-secondary mt-1">{pkg.description}</p>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-page">{fmtCNY(pkg.price)}</span>
                    {pkg.original_price > 0 && pkg.original_price > pkg.price && (
                      <span className="text-lg text-page-muted line-through">{fmtCNY(pkg.original_price)}</span>
                    )}
                  </div>
                  {pkg.duration > 0 && (
                    <p className="text-sm text-page-muted mt-1">{t('packages.daysAccess', { count: pkg.duration })}</p>
                  )}
                </div>

                {/* Official Equiv Banner */}
                {equivList.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                    <p className="text-xs text-page-warning font-medium">
                      🔥 <RotatingEquiv
                        items={equivList}
                        text={(item) => t('packages.officialEquiv', { model: item.label, amount: item.equivDollars })}
                      />
                    </p>
                  </div>
                )}

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {pkg.quota_amount > 0 && (
                    <li className="flex items-center gap-2 text-sm text-page-label">
                      <svg className="w-4 h-4 text-page-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isSubscription
                        ? t('packages.periodicQuota', { symbol, amount: (pkg.quota_amount / Q * rate).toFixed(2), period: getResetLabel(resetPeriod) })
                        : t('packages.creditIncluded', { symbol, amount: (pkg.quota_amount / Q * rate).toFixed(2) })
                      }
                    </li>
                  )}
                  {isSubscription && (
                    <li className="flex items-center gap-2 text-sm text-page-label">
                      <svg className="w-4 h-4 text-page-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('packages.unusedQuotaExpires')}
                    </li>
                  )}
                  <li className="flex items-center gap-2 text-sm text-page-label">
                    <svg className="w-4 h-4 text-page-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('packages.allModels')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-page-label">
                    <svg className="w-4 h-4 text-page-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('packages.openaiApi')}
                  </li>
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(pkg)}
                  disabled={subscribing === pkg.id}
                  className="btn-primary w-full text-center"
                >
                  {subscribing === pkg.id ? t('packages.processing') : user ? t('packages.subscribeNow') : t('packages.signUpToSubscribe')}
                </button>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmPkg && (() => {
        const userBalance = (user?.quota || 0) / Q * rate;
        const pkgPrice = Number(confirmPkg.price);
        const insufficient = userBalance < pkgPrice;
        const resetPeriod = confirmPkg.quota_reset_period || 'never';
        const isSubscription = resetPeriod !== 'never';
        return (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !subscribing && setConfirmPkg(null)}>
          <div className="glass rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-page mb-3">{t('packages.confirmTitle')}</h2>
            <p className="text-sm text-page-secondary mb-2">
              {t('packages.confirmDesc', { name: confirmPkg.name, price: fmtCNY(pkgPrice) })}
            </p>
            {isSubscription && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mb-3">
                <p className="text-xs text-page-info">
                  {t('packages.subscriptionInfo', {
                    symbol,
                    period: getResetLabel(resetPeriod),
                    days: confirmPkg.duration || 30,
                    amount: (confirmPkg.quota_amount / Q * rate).toFixed(2),
                  })}
                </p>
              </div>
            )}
            <p className="text-sm text-page-secondary mb-4">
              {t('packages.yourBalance')} <span className={`font-medium ${insufficient ? 'text-page-danger' : 'text-page-success'}`}>{symbol}{userBalance.toFixed(2)}</span>
            </p>
            {insufficient && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                <p className="text-sm text-page-danger">{t('packages.insufficientBalance')}</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmPkg(null)} disabled={subscribing} className="btn-secondary">{t('tokens.cancel')}</button>
              <button onClick={confirmSubscribe} disabled={insufficient || subscribing} className="btn-primary">
                {subscribing ? t('packages.processing') : t('packages.confirm')}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

/* ───────── Decorative SVGs ───────── */

/**
 * Hero illustration: three layered "package" cards with sparkles.
 * Pure inline SVG; uses gradients matching the AI theme blue palette.
 */
function PackagesHeroArt() {
  return (
    <svg
      viewBox="0 0 220 140"
      className="w-44 md:w-52 h-auto mb-2 drop-shadow-[0_8px_24px_rgba(37,99,235,0.18)]"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pkgCard1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
        <linearGradient id="pkgCard2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="pkgCard3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="60%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>

      {/* Back card */}
      <g transform="translate(38 22) rotate(-10 60 40)">
        <rect width="120" height="80" rx="14" fill="url(#pkgCard1)" />
        <rect x="14" y="18" width="50" height="6" rx="3" fill="#ffffff" opacity="0.9" />
        <rect x="14" y="32" width="80" height="4" rx="2" fill="#ffffff" opacity="0.7" />
        <rect x="14" y="42" width="60" height="4" rx="2" fill="#ffffff" opacity="0.55" />
      </g>

      {/* Middle card */}
      <g transform="translate(50 30)">
        <rect width="120" height="80" rx="14" fill="url(#pkgCard2)" />
        <rect x="14" y="18" width="58" height="6" rx="3" fill="#ffffff" opacity="0.95" />
        <rect x="14" y="32" width="86" height="4" rx="2" fill="#ffffff" opacity="0.8" />
        <rect x="14" y="42" width="68" height="4" rx="2" fill="#ffffff" opacity="0.65" />
      </g>

      {/* Front card (primary) */}
      <g transform="translate(60 38) rotate(8 60 40)">
        <rect width="120" height="80" rx="14" fill="url(#pkgCard3)" />
        {/* Crown / star icon */}
        <path
          d="M30 32 L36 22 L42 32 L52 26 L48 42 L24 42 L20 26 Z"
          fill="#ffffff"
          opacity="0.95"
        />
        <rect x="62" y="26" width="40" height="5" rx="2.5" fill="#ffffff" opacity="0.9" />
        <rect x="62" y="36" width="32" height="4" rx="2" fill="#ffffff" opacity="0.7" />
        {/* "Price tag" pill */}
        <rect x="20" y="54" width="86" height="14" rx="7" fill="#ffffff" opacity="0.18" stroke="#ffffff" strokeOpacity="0.35" />
        <text x="63" y="64" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff" fontFamily="ui-monospace,monospace">
          BLUEFUTURE
        </text>
      </g>

      {/* Sparkles */}
      <g fill="#fbbf24">
        <path d="M24 22 L26 26 L30 28 L26 30 L24 34 L22 30 L18 28 L22 26 Z" opacity="0.95" />
        <path d="M196 50 L197.5 53 L200.5 54.5 L197.5 56 L196 59 L194.5 56 L191.5 54.5 L194.5 53 Z" opacity="0.85" />
        <circle cx="186" cy="100" r="2.5" opacity="0.9" />
        <circle cx="32" cy="110" r="2" opacity="0.7" />
      </g>
    </svg>
  );
}

/**
 * Empty state illustration: an open box with a soft sparkle inside.
 */
function EmptyPackagesArt() {
  return (
    <svg
      viewBox="0 0 160 120"
      className="w-32 h-auto mx-auto"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="emptyBoxBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
        <linearGradient id="emptyBoxLid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      {/* Box body */}
      <path
        d="M28 60 L80 78 L132 60 L132 100 L80 116 L28 100 Z"
        fill="url(#emptyBoxBody)"
      />
      <path d="M80 78 L80 116" stroke="#3b82f6" strokeOpacity="0.3" strokeWidth="1.5" />
      {/* Open lid (front flap) */}
      <path
        d="M28 60 L80 44 L132 60 L80 78 Z"
        fill="url(#emptyBoxLid)"
      />
      {/* Inner shadow */}
      <path
        d="M52 67 L80 75 L108 67 L80 83 Z"
        fill="#1e3a8a"
        opacity="0.12"
      />
      {/* Sparkle floating above */}
      <g>
        <path
          d="M80 26 L83 36 L93 39 L83 42 L80 52 L77 42 L67 39 L77 36 Z"
          fill="#fbbf24"
          opacity="0.95"
        />
        <circle cx="60" cy="32" r="2" fill="#60a5fa" opacity="0.7" />
        <circle cx="104" cy="34" r="1.6" fill="#60a5fa" opacity="0.6" />
      </g>
    </svg>
  );
}
