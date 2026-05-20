import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  getUserUsage,
  redeemCode,
  getAffCode,
  transferAffQuota,
  getAffEarnings,
  requestAffWithdraw,
  getDistKolStatus,
  submitDistKolApply,
  Q,
} from '../api';
import { useCurrency, useSite } from '../context/SiteContext';
import CountUp from '../components/bits/CountUp';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { symbol, rate } = useCurrency();
  const { site } = useSite();
  const [usage, setUsage] = useState(null);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  // Invitation / Aff
  const [affLink, setAffLink] = useState('');
  const [affEarnings, setAffEarnings] = useState([]);
  const [showAffEarnings, setShowAffEarnings] = useState(false);
  const [affEarningsLoading, setAffEarningsLoading] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawRemark, setWithdrawRemark] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [distKolStatus, setDistKolStatus] = useState(null);
  const [showKolApplyModal, setShowKolApplyModal] = useState(false);
  const [kolApplyLoading, setKolApplyLoading] = useState(false);
  const [socialLink, setSocialLink] = useState('');
  const [followers, setFollowers] = useState('');
  const [promotionPlan, setPromotionPlan] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [usageRes, affRes, kolRes] = await Promise.all([
        getUserUsage(),
        getAffCode().catch(() => null),
        getDistKolStatus().catch(() => null),
      ]);
      if (usageRes.data.success) setUsage(usageRes.data.data);
      if (affRes?.data?.success && affRes.data.data) {
        setAffLink(`${window.location.origin}/register?aff=${affRes.data.data}`);
      }
      if (kolRes?.data?.success) {
        setDistKolStatus(kolRes.data.data || null);
      }
    } catch (e) {
      /* interceptor */
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!redeemInput.trim()) return;
    setRedeeming(true);
    try {
      const res = await redeemCode(redeemInput.trim());
      if (res.data.success) {
        toast.success(t('dashboard.redeemSuccess'));
        setRedeemInput('');
        await Promise.all([loadData(), refreshUser()]);
      }
    } catch (err) {
      /* interceptor */
    }
    setRedeeming(false);
  };

  const loadAffEarnings = async () => {
    setAffEarningsLoading(true);
    try {
      const res = await getAffEarnings({ page: 1, page_size: 20 });
      if (res.data.success && res.data.data) {
        setAffEarnings(res.data.data);
      }
    } catch (e) {
      /* interceptor */
    }
    setAffEarningsLoading(false);
  };

  const handleCopyAffLink = () => {
    if (!affLink) return;
    navigator.clipboard.writeText(affLink).then(() => {
      toast.success(t('topup.copied'));
    }).catch(() => {
      toast.error('Copy failed');
    });
  };

  const handleTransfer = async () => {
    const val = parseInt(transferAmount);
    if (!val || val <= 0) {
      toast.error(t('topup.enterAmount'));
      return;
    }
    setTransferring(true);
    try {
      const res = await transferAffQuota({ quota: val });
      if (res.data.success) {
        toast.success(res.data.message || t('topup.transferSuccess'));
        setTransferAmount('');
        await Promise.all([loadData(), refreshUser()]);
      }
    } catch (e) {
      /* interceptor */
    }
    setTransferring(false);
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount('');
    setWithdrawMethod('');
    setWithdrawRemark('');
  };

  const handleOpenWithdraw = () => {
    resetWithdrawForm();
    setShowWithdrawModal(true);
  };

  const handleCloseWithdraw = () => {
    if (withdrawing) return;
    resetWithdrawForm();
    setShowWithdrawModal(false);
  };

  const resetKolApplyForm = () => {
    setSocialLink('');
    setFollowers('');
    setPromotionPlan('');
    setContactInfo('');
  };

  const handleOpenKolApply = () => {
    resetKolApplyForm();
    setShowKolApplyModal(true);
  };

  const handleCloseKolApply = () => {
    if (kolApplyLoading) return;
    resetKolApplyForm();
    setShowKolApplyModal(false);
  };

  const quota = usage?.quota ?? user?.quota ?? 0;
  const usedQuota = usage?.used_quota ?? user?.used_quota ?? 0;
  const packageUsedQuota = usage?.package_used_quota ?? user?.package_used_quota ?? 0;
  const requestCount = usage?.request_count ?? user?.request_count ?? 0;
  const balanceDollars = (quota / Q) * rate;
  const availableAffAmount = ((user?.aff_quota || 0) / Q) * rate;
  const defaultCommissionRate = Number(user?.default_commission_rate ?? 0.05);
  const currentCommissionRate = Number(
    user?.commission_rate ?? defaultCommissionRate,
  );
  const hasCustomCommissionRate =
    currentCommissionRate > defaultCommissionRate + 1e-8;

  const handleWithdraw = async () => {
    const amount = Number.parseFloat(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('topup.invalidWithdrawAmount'));
      return;
    }
    if (amount - availableAffAmount > 1e-8) {
      toast.error(t('topup.withdrawExceedsBalance'));
      return;
    }
    if (!withdrawMethod.trim()) {
      toast.error(t('topup.enterWithdrawMethod'));
      return;
    }

    setWithdrawing(true);
    try {
      const res = await requestAffWithdraw({
        amount: amount / rate,
        payment_method: withdrawMethod.trim(),
        remark: withdrawRemark.trim(),
      });
      if (res.data.success) {
        toast.success(res.data.message || t('topup.withdrawSuccess'));
        setShowWithdrawModal(false);
        resetWithdrawForm();
        await Promise.all([loadData(), refreshUser()]);
      }
    } catch (err) {
      /* interceptor */
    }
    setWithdrawing(false);
  };

  const handleKolApply = async () => {
    if (!socialLink.trim()) {
      toast.error(t('topup.kolSocialRequired'));
      return;
    }
    setKolApplyLoading(true);
    try {
      const res = await submitDistKolApply({
        social_link: socialLink.trim(),
        followers: followers.trim(),
        promotion_plan: promotionPlan.trim(),
        contact_info: contactInfo.trim(),
      });
      if (res.data.success) {
        toast.success(res.data.message || t('topup.kolApplySuccess'));
        setShowKolApplyModal(false);
        resetKolApplyForm();
        await Promise.all([loadData(), refreshUser()]);
      }
    } catch (err) {
      /* interceptor */
    }
    setKolApplyLoading(false);
  };

  const renderCommissionApplicationPanel = () => {
    if (distKolStatus?.status === 0) {
      return (
        <div className="glass-sm rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-page">{t('topup.kolPendingTitle')}</p>
              <p className="mt-1 text-xs text-page-secondary">{t('topup.kolPendingDesc')}</p>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
              {t('topup.kolPendingBadge')}
            </span>
          </div>
        </div>
      );
    }

    if (distKolStatus?.status === 1 || hasCustomCommissionRate) {
      return (
        <div className="glass-sm rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-page">{t('topup.kolApprovedTitle')}</p>
              <p className="mt-1 text-xs text-page-secondary">{t('topup.kolApprovedDesc')}</p>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
              {(currentCommissionRate * 100).toFixed(1)}%
            </span>
          </div>
          {distKolStatus?.admin_remark && (
            <p className="mt-3 text-xs text-page-muted">
              {t('topup.kolRemarkLabel')}
              {distKolStatus.admin_remark}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="glass-sm rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-page">{t('topup.kolApplyTitle')}</p>
            <p className="mt-1 text-xs text-page-secondary">
              {t('topup.kolApplyDesc', {
                rate: (defaultCommissionRate * 100).toFixed(1),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenKolApply}
            className="btn-primary whitespace-nowrap px-4 py-2 text-sm"
          >
            {t('topup.kolApplyAction')}
          </button>
        </div>
        {distKolStatus?.status === 2 && (
          <p className="mt-3 text-xs text-red-500">
            {t('topup.kolRejectedLabel')}
            {distKolStatus.admin_remark || t('topup.kolRejectedFallback')}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-page mb-1">
          {t('dashboard.welcome')} {user?.display_name || user?.username || 'User'}
        </h1>
        <p className="text-sm text-page-secondary">{t('dashboard.manageDesc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-page-secondary mb-2">{t('dashboard.balance')}</p>
          <div className="text-3xl font-bold text-page">
            {symbol}
            <CountUp from={0} to={balanceDollars} duration={1.5} decimals={2} />
          </div>
          <p className="text-xs text-page-muted mt-1">{t('dashboard.quotaUnits', { count: quota.toLocaleString() })}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-page-secondary mb-2">{t('dashboard.used')}</p>
          <div className="text-3xl font-bold text-page">
            {symbol}
            <CountUp from={0} to={(usedQuota / Q) * rate} duration={1.5} decimals={2} />
          </div>
          <p className="text-xs text-page-muted mt-1">{t('dashboard.quotaUnits', { count: usedQuota.toLocaleString() })}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-page-secondary mb-2">{t('dashboard.packageUsed')}</p>
          <div className="text-3xl font-bold text-page">
            {symbol}
            <CountUp from={0} to={(packageUsedQuota / Q) * rate} duration={1.5} decimals={2} />
          </div>
          <p className="text-xs text-page-muted mt-1">{t('dashboard.quotaUnits', { count: packageUsedQuota.toLocaleString() })}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-page-secondary mb-2">{t('dashboard.totalRequests')}</p>
          <div className="text-3xl font-bold text-page">
            <CountUp from={0} to={requestCount} duration={1.5} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-page mb-4">{t('dashboard.redeemCode')}</h2>
          <form onSubmit={handleRedeem} className="flex gap-3">
            <input
              type="text"
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value)}
              className="input flex-1"
              placeholder={t('dashboard.enterCode')}
            />
            <button type="submit" disabled={redeeming} className="btn-primary whitespace-nowrap">
              {redeeming ? t('dashboard.redeeming') : t('dashboard.redeem')}
            </button>
          </form>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-page mb-4">{t('dashboard.quickLinks')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/tokens" className="glass-sm !rounded-xl px-4 py-3 hover:bg-page-surface-hover transition-colors group">
              <p className="text-sm font-medium text-page group-hover:text-page-link transition-colors">{t('dashboard.apiKeys')}</p>
              <p className="text-xs text-page-muted">{t('dashboard.manageKeys')}</p>
            </Link>
            <Link to="/topup" className="glass-sm !rounded-xl px-4 py-3 hover:bg-page-surface-hover transition-colors group">
              <p className="text-sm font-medium text-page group-hover:text-page-link transition-colors">{t('nav.topup')}</p>
              <p className="text-xs text-page-muted">{t('dashboard.topupDesc')}</p>
            </Link>
            <Link to="/packages" className="glass-sm !rounded-xl px-4 py-3 hover:bg-page-surface-hover transition-colors group">
              <p className="text-sm font-medium text-page group-hover:text-page-link transition-colors">{t('dashboard.packages')}</p>
              <p className="text-xs text-page-muted">{t('dashboard.viewPlans')}</p>
            </Link>
            <Link to="/pricing" className="glass-sm !rounded-xl px-4 py-3 hover:bg-page-surface-hover transition-colors group">
              <p className="text-sm font-medium text-page group-hover:text-page-link transition-colors">{t('dashboard.pricing')}</p>
              <p className="text-xs text-page-muted">{t('dashboard.modelPrices')}</p>
            </Link>
            <Link to="/logs" className="glass-sm !rounded-xl px-4 py-3 hover:bg-page-surface-hover transition-colors group">
              <p className="text-sm font-medium text-page group-hover:text-page-link transition-colors">{t('dashboard.logs')}</p>
              <p className="text-xs text-page-muted">{t('dashboard.viewLogs')}</p>
            </Link>
            {site?.allow_sub_dist && (
              <Link to="/sub-site" className="glass-sm !rounded-xl px-4 py-3 hover:bg-page-surface-hover transition-colors group">
                <p className="text-sm font-medium text-page group-hover:text-page-link transition-colors">{t('subDist.nav')}</p>
                <p className="text-xs text-page-muted">{t('subDist.dashboardEntry')}</p>
              </Link>
            )}
          </div>
        </div>
      </div>

      {affLink && (
        <div className="glass rounded-2xl p-6 mt-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-page mb-1">{t('topup.inviteTitle')}</h2>
              <p className="text-sm text-page-secondary">{t('topup.inviteSubtitle')}</p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-medium text-page">
              <span className="text-page-secondary">{t('topup.currentCommissionRateLabel')}</span>
              <span className="text-page-link">{(currentCommissionRate * 100).toFixed(1)}%</span>
            </div>
          </div>

          <p className="mb-5 text-xs text-page-muted">
            {t('topup.currentCommissionRateDesc', {
              rate: (defaultCommissionRate * 100).toFixed(1),
            })}
          </p>

          <div className="mb-5">
            {renderCommissionApplicationPanel()}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-sm rounded-xl p-4 text-center">
              <p className="text-xs text-page-secondary mb-1">{t('topup.affAvailable')}</p>
              <p className="text-xl font-bold text-page">
                {symbol}{(((user?.aff_quota || 0) / Q) * rate).toFixed(2)}
              </p>
            </div>
            <div className="glass-sm rounded-xl p-4 text-center">
              <p className="text-xs text-page-secondary mb-1">{t('topup.affTotal')}</p>
              <p className="text-xl font-bold text-page">
                {symbol}{(((user?.aff_history_quota || 0) / Q) * rate).toFixed(2)}
              </p>
            </div>
            <div className="glass-sm rounded-xl p-4 text-center">
              <p className="text-xs text-page-secondary mb-1">{t('topup.affCount')}</p>
              <p className="text-xl font-bold text-page">{user?.aff_count || 0}</p>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-page-label mb-2">{t('topup.inviteLink')}</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={affLink} className="input flex-1 text-sm" />
              <button onClick={handleCopyAffLink} className="btn-primary whitespace-nowrap text-sm px-4">
                {t('topup.copy')}
              </button>
            </div>
          </div>

          {(user?.aff_quota || 0) > 0 && (
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-page-label">{t('topup.transferToBalance')}</label>
                <button type="button" onClick={handleOpenWithdraw} className="btn-secondary whitespace-nowrap px-4 py-2 text-sm">
                  {t('topup.withdraw')}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder={t('topup.transferPlaceholder')}
                  className="input flex-1 text-sm"
                  min={1}
                />
                <button onClick={handleTransfer} disabled={transferring} className="btn-primary whitespace-nowrap text-sm px-4">
                  {transferring ? t('topup.processing') : t('topup.transfer')}
                </button>
              </div>
            </div>
          )}

          <div>
            <button
              onClick={() => {
                setShowAffEarnings(!showAffEarnings);
                if (!showAffEarnings) loadAffEarnings();
              }}
              className="text-sm text-page-secondary hover:text-page transition-colors"
            >
              {showAffEarnings ? t('topup.hideEarnings') : t('topup.viewEarnings')}
            </button>
            {showAffEarnings && (
              <div className="mt-3">
                {affEarningsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                  </div>
                ) : affEarnings.length === 0 ? (
                  <p className="text-sm text-page-muted text-center py-6">{t('topup.noEarnings')}</p>
                ) : (
                  <div className="space-y-2">
                    {affEarnings.map((item, i) => (
                      <div key={i} className="flex items-center justify-between glass-sm rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm text-page">{item.model_name}</p>
                          <p className="text-xs text-page-muted">
                            {new Date(item.created_time * 1000).toLocaleString()} · {(item.commission_rate * 100).toFixed(1)}%
                          </p>
                        </div>
                        <span className="text-sm font-medium text-page-success">
                          +{symbol}{((item.commission_quota / Q) * rate).toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleCloseWithdraw}
        >
          <div className="glass w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-page mb-1">{t('topup.withdrawTitle')}</h3>
              <p className="text-sm text-page-secondary">{t('topup.withdrawSubtitle')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-page-label">{t('topup.withdrawAvailable')}</label>
                <input
                  type="text"
                  readOnly
                  value={`${symbol}${availableAffAmount.toFixed(2)}`}
                  className="input bg-page-surface-hover/60 text-page-secondary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-page-label">{t('topup.withdrawAmount')}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-page-muted">
                      {symbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="input pl-8"
                    />
                  </div>
                  <button type="button" onClick={() => setWithdrawAmount(availableAffAmount.toFixed(2))} className="btn-secondary whitespace-nowrap px-4">
                    {t('topup.withdrawAll')}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-page-label">{t('topup.withdrawMethod')}</label>
                <input
                  type="text"
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  placeholder={t('topup.withdrawMethodPlaceholder')}
                  className="input"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-page-label">{t('topup.withdrawRemark')}</label>
                <textarea
                  value={withdrawRemark}
                  onChange={(e) => setWithdrawRemark(e.target.value)}
                  placeholder={t('topup.withdrawRemarkPlaceholder')}
                  className="input min-h-[96px] resize-y"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={handleCloseWithdraw} disabled={withdrawing} className="btn-secondary px-4 py-2">
                {t('tokens.cancel')}
              </button>
              <button type="button" onClick={handleWithdraw} disabled={withdrawing} className="btn-primary px-4 py-2">
                {withdrawing ? t('topup.processing') : t('topup.submitWithdraw')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showKolApplyModal && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleCloseKolApply}
        >
          <div className="glass w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-page mb-1">{t('topup.kolApplyModalTitle')}</h3>
              <p className="text-sm text-page-secondary">{t('topup.kolApplyModalDesc')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-page-label">{t('topup.kolSocialLabel')}</label>
                <input
                  type="text"
                  value={socialLink}
                  onChange={(e) => setSocialLink(e.target.value)}
                  placeholder={t('topup.kolSocialPlaceholder')}
                  className="input"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-page-label">{t('topup.kolFollowersLabel')}</label>
                <input
                  type="text"
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                  placeholder={t('topup.kolFollowersPlaceholder')}
                  className="input"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-page-label">{t('topup.kolPlanLabel')}</label>
                <textarea
                  value={promotionPlan}
                  onChange={(e) => setPromotionPlan(e.target.value)}
                  placeholder={t('topup.kolPlanPlaceholder')}
                  className="input min-h-[96px] resize-y"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-page-label">{t('topup.kolContactLabel')}</label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder={t('topup.kolContactPlaceholder')}
                  className="input"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={handleCloseKolApply} disabled={kolApplyLoading} className="btn-secondary px-4 py-2">
                {t('tokens.cancel')}
              </button>
              <button type="button" onClick={handleKolApply} disabled={kolApplyLoading} className="btn-primary px-4 py-2">
                {kolApplyLoading ? t('topup.processing') : t('topup.kolApplySubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
