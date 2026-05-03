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
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-heading font-bold text-page mb-3">{t('packages.title')}</h1>
        <p className="text-page-secondary max-w-xl mx-auto">
          {t('packages.subtitle')}
        </p>
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
        <div className="text-center py-12 text-page-secondary">
          <p>{t('packages.noPackages')}</p>
          <Link to="/pricing" className="text-page-link hover:text-page-link transition-colors mt-2 inline-block">
            {t('packages.checkPricing')} &rarr;
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
                  className="btn-primary mt-2 w-full text-center"
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
