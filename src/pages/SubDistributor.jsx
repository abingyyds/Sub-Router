import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Copy,
  CreditCard,
  Loader2,
  Network,
  RefreshCw,
  WalletCards,
} from 'lucide-react';
import { createSubDistributorOrder, getCryptoOrderStatus, getSubDistributorInfo } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSite, useCurrency } from '../context/SiteContext';
import CryptoTopupReconcileModal from '../components/CryptoTopupReconcileModal';
import {
  CRYPTO_NETWORKS,
  CRYPTO_TOKEN_OPTIONS,
  CryptoNetworkIcon,
  CryptoTokenIcon,
} from '../components/CryptoIcons';

function normalizeHost(value) {
  if (!value) return '';
  return String(value).replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function formatCryptoCountdown(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function submitEpayForm(resData) {
  const params = resData.data;
  const url = resData.url;
  if (!params || !url) return false;
  const form = document.createElement('form');
  form.action = url;
  form.method = 'POST';
  const isSafari = navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') < 1;
  if (!isSafari) {
    form.target = '_blank';
  }
  Object.keys(params).forEach((key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = params[key];
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  return true;
}

export default function SubDistributor() {
  const { t } = useTranslation();
  const { user, refreshUser, loading: authLoading } = useAuth();
  const { site } = useSite();
  const { symbol, fmtCNY } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subInfo, setSubInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cryptoOrder, setCryptoOrder] = useState(null);
  const [cryptoStatus, setCryptoStatus] = useState('pending');
  const [cryptoTimeLeft, setCryptoTimeLeft] = useState(0);
  const [cryptoChecking, setCryptoChecking] = useState(false);
  const [reconcileRecord, setReconcileRecord] = useState(null);
  const cryptoTimersRef = useRef({ interval: null, countdown: null, deadline: 0, checking: false, successNotified: false });
  const [form, setForm] = useState({
    name: '',
    slug: '',
    payment_method: '',
    chain: 'tron',
    token: 'usdt',
  });

  const stopCryptoPolling = useCallback(() => {
    const timers = cryptoTimersRef.current;
    if (timers.interval) clearInterval(timers.interval);
    if (timers.countdown) clearInterval(timers.countdown);
    timers.interval = null;
    timers.countdown = null;
    timers.deadline = 0;
    timers.checking = false;
    setCryptoChecking(false);
  }, []);

  useEffect(() => () => stopCryptoPolling(), [stopCryptoPolling]);

  const pollCryptoOrderStatus = useCallback(async (tradeNo, { silent = true } = {}) => {
    if (!tradeNo || cryptoTimersRef.current.checking) return null;
    cryptoTimersRef.current.checking = true;
    if (!silent) setCryptoChecking(true);
    try {
      const res = await getCryptoOrderStatus(tradeNo);
      if (res.data?.message !== 'success' || !res.data?.data) {
        if (!silent) {
          toast.error(res.data?.data || res.data?.message || t('topup.reconcileQueryFailed'));
        }
        return null;
      }
      const data = res.data.data;
      const status = String(data.status || 'pending').toLowerCase();
      setCryptoStatus(status);
      if (status === 'success') {
        stopCryptoPolling();
        if (!cryptoTimersRef.current.successNotified) {
          cryptoTimersRef.current.successNotified = true;
          toast.success(t('subDist.openedSuccess'));
        }
        await refreshUser({ skipErrorHandler: true });
      } else if (status === 'expired') {
        stopCryptoPolling();
        if (!silent) toast.error(t('topup.orderExpired'));
      }
      return data;
    } catch {
      // Keep the interval alive; a temporary RPC/API failure should not lose
      // the user's pending order or hide the recovery action.
      if (!silent) toast.error(t('topup.reconcileQueryFailed'));
      return null;
    } finally {
      cryptoTimersRef.current.checking = false;
      if (!silent) setCryptoChecking(false);
    }
  }, [refreshUser, stopCryptoPolling, t]);

  const startCryptoPolling = useCallback((order) => {
    if (!order?.trade_no) return;
    stopCryptoPolling();
    cryptoTimersRef.current.successNotified = false;
    setCryptoStatus('pending');
    const expiresAt = Number(order.expires_at || 0);
    const fallbackExpiry = Math.floor(Date.now() / 1000) + Math.max(1, Number(order.expiry_minutes || 30)) * 60;
    const deadline = expiresAt > 0 ? expiresAt : fallbackExpiry;
    cryptoTimersRef.current.deadline = deadline;
    setCryptoTimeLeft(Math.max(0, deadline - Math.floor(Date.now() / 1000)));

    const poll = () => pollCryptoOrderStatus(order.trade_no, { silent: true });
    poll();
    cryptoTimersRef.current.interval = setInterval(poll, 5000);
    cryptoTimersRef.current.countdown = setInterval(() => {
      const remaining = Math.max(0, cryptoTimersRef.current.deadline - Math.floor(Date.now() / 1000));
      setCryptoTimeLeft(remaining);
      if (remaining === 0) {
        stopCryptoPolling();
        setCryptoStatus((status) => (status === 'success' ? status : 'expired'));
      }
    }, 1000);
  }, [pollCryptoOrderStatus, stopCryptoPolling]);

  const copyCryptoValue = useCallback(async (value) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      toast.success(t('topup.copied'));
    } catch {
      toast.error(t('topup.copyFailed'));
    }
  }, [t]);

  useEffect(() => {
    getSubDistributorInfo()
      .then((res) => {
        if (res.data.success) {
          const info = res.data.data;
          setSubInfo(info);
          if (info.pay_methods?.length > 0) {
            setForm((prev) => ({ ...prev, payment_method: info.pay_methods[0].type }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const paymentMethods = subInfo?.pay_methods || [];
  const availableCryptoChains = useMemo(() => {
    const wallets = subInfo?.crypto_wallets || {};
    return Object.entries(CRYPTO_NETWORKS)
      .filter(([key]) => wallets[key])
      .map(([key, meta]) => ({ key, ...meta }));
  }, [subInfo?.crypto_wallets]);
  const currentPayMethod = useMemo(
    () => paymentMethods.find((item) => item.type === form.payment_method),
    [paymentMethods, form.payment_method]
  );
  const selectedCryptoChain = availableCryptoChains.find((chain) => chain.key === form.chain);
  const selectedCryptoLabel = selectedCryptoChain
    ? `${form.token.toUpperCase()} (${selectedCryptoChain.label} / ${selectedCryptoChain.tag})`
    : form.token.toUpperCase();
  const cryptoUnavailable = form.payment_method === 'crypto' && availableCryptoChains.length === 0;

  useEffect(() => {
    if (availableCryptoChains.length === 0) return;
    if (!availableCryptoChains.some((chain) => chain.key === form.chain)) {
      setForm((prev) => ({ ...prev, chain: availableCryptoChains[0].key }));
    }
  }, [availableCryptoChains, form.chain]);
  const paymentReturned = useMemo(
    () => new URLSearchParams(location.search).get('payment') === 'return',
    [location.search]
  );
  const currentSiteName = site?.name || t('subDist.defaultSiteName');
  const currentSiteDomain = useMemo(() => {
    const configuredDomain = normalizeHost(site?.domain);
    if (configuredDomain) return configuredDomain;
    if (typeof window !== 'undefined') return window.location.host;
    return '';
  }, [site?.domain]);

  useEffect(() => {
    if (!paymentReturned || authLoading) return;

    let cancelled = false;
    const toastId = 'sub-dist-payment-return';

    const checkPaymentResult = async () => {
      if (!user) {
        toast(t('subDist.paymentPending'), { id: toastId });
        navigate('/sub-site', { replace: true });
        return;
      }

      toast.loading(t('subDist.confirmingPayment'), { id: toastId });
      const refreshed = await refreshUser({ skipErrorHandler: true });
      if (cancelled) return;

      if (refreshed?.has_distributor) {
        toast.success(t('subDist.openedSuccess'), { id: toastId });
      } else {
        toast(t('subDist.paymentPending'), { id: toastId });
      }
      navigate('/sub-site', { replace: true });
    };

    checkPaymentResult();
    return () => {
      cancelled = true;
    };
  }, [authLoading, navigate, paymentReturned, refreshUser, t, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error(t('subDist.loginRequired'));
      return;
    }
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error(t('subDist.fillRequired'));
      return;
    }
    if (!form.payment_method) {
      toast.error(t('subDist.selectPayment'));
      return;
    }
    if (form.payment_method === 'crypto' && !selectedCryptoChain) {
      toast.error(t('当前暂未配置可用的加密货币收款网络'));
      return;
    }

    setSubmitting(true);
    stopCryptoPolling();
    setCryptoOrder(null);
    setReconcileRecord(null);
    setCryptoStatus('pending');
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        payment_method: form.payment_method,
        return_url: `${window.location.origin}/sub-site?payment=return`,
      };
      if (form.payment_method === 'crypto') {
        payload.chain = form.chain;
        payload.token = form.token;
      }
      const res = await createSubDistributorOrder(payload);
      if (res.data.message === 'success') {
        if (res.data.payment_type === 'stripe' && res.data.data?.pay_link) {
          const opened = window.open(res.data.data.pay_link, '_blank');
          if (opened) {
            toast.success(t('subDist.paymentPageOpened'));
          } else {
            toast.error(t('subDist.popupBlocked'));
          }
        } else if (res.data.payment_type === 'crypto') {
          setCryptoOrder(res.data.data);
          startCryptoPolling(res.data.data);
          toast.success(t('subDist.cryptoOrderCreated'));
        } else {
          if (submitEpayForm(res.data)) {
            toast.success(t('subDist.paymentPageOpened'));
          } else {
            toast.error(t('subDist.paymentPageFailed'));
          }
        }
      } else if (res.data.data) {
        toast.error(typeof res.data.data === 'string' ? res.data.data : t('subDist.createFailed'));
      } else {
        toast.error(t('subDist.createFailed'));
      }
    } catch (e) {
      // handled by interceptor
    }
    setSubmitting(false);
  };

  const cryptoOrderChain = String(cryptoOrder?.chain || form.chain || '').toLowerCase();
  const cryptoOrderToken = String(cryptoOrder?.token || form.token || 'usdt').toLowerCase();
  const cryptoOrderChainMeta = CRYPTO_NETWORKS[cryptoOrderChain];
  const cryptoOrderLabel = cryptoOrderChainMeta
    ? `${cryptoOrderToken.toUpperCase()} (${cryptoOrderChainMeta.label} / ${cryptoOrderChainMeta.tag})`
    : cryptoOrderToken.toUpperCase();
  const cryptoOrderStatus = String(cryptoStatus || 'pending').toLowerCase();
  const cryptoOrderCanReconcile = cryptoOrder && ['pending', 'expired'].includes(cryptoOrderStatus);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        <div className="glass rounded-3xl p-8">
          <div className="mb-8">
            <p className="text-sm text-page-link font-medium mb-3">{t('subDist.badge')}</p>
            <h1 className="text-3xl font-heading font-bold text-page mb-3">{t('subDist.title')}</h1>
            <p className="text-sm text-page-secondary leading-6">
              {t('subDist.subtitle', { name: currentSiteName })}
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-page-divider bg-page-surface/60 p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-page">{t('subDist.exampleTitle')}</p>
              <p className="mt-1 text-xs text-page-secondary leading-5">
                {t('subDist.exampleDesc', { name: currentSiteName })}
              </p>
            </div>
            <div className="rounded-2xl border border-page-divider bg-page-inset/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-page">{currentSiteDomain || currentSiteName}</p>
                  <p className="mt-1 text-xs text-page-muted">
                    {t('subDist.exampleCategory', { name: currentSiteName })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium text-page-link">
                  {t('subDist.exampleStatus')}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['subDist.featureDomain', 'subDist.featureBrand', 'subDist.featureRecharge'].map((key) => (
                  <span key={key} className="rounded-full bg-page-surface px-2.5 py-1 text-[11px] text-page-secondary">
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-page-divider bg-page-link/5 p-3">
              <p className="text-xs text-page-secondary leading-relaxed">{t('subDist.exampleNote')}</p>
            </div>
          </div>

          {!subInfo?.enabled ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <p className="text-sm font-medium text-page mb-2">{t('subDist.notAvailable')}</p>
              <p className="text-sm text-page-secondary">{subInfo?.disabled_reason || t('subDist.disabledFallback')}</p>
            </div>
          ) : !user ? (
            <div className="rounded-2xl border border-border p-5 space-y-4">
              <p className="text-sm text-page-secondary">{t('subDist.loginHint')}</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/login" className="btn-primary">{t('subDist.goLogin')}</Link>
                <Link to="/register" className="btn-secondary">{t('subDist.goRegister')}</Link>
              </div>
            </div>
          ) : user?.has_distributor ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <p className="text-sm font-medium text-page">{t('subDist.alreadyOpenTitle')}</p>
              <p className="text-sm text-page-secondary">
                {t('subDist.alreadyOpenDesc', {
                  name: user.distributor_name || user.distributor_slug || t('subDist.defaultSiteName'),
                })}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-page-label mb-2">{t('subDist.siteName')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder={t('subDist.siteNamePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-page-label mb-2">{t('subDist.siteSlug')}</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                  className="input"
                  placeholder="my-sub-site"
                  required
                />
                <p className="text-xs text-page-muted mt-2">{t('subDist.siteSlugHelp')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-page-label mb-2">{t('subDist.paymentMethod')}</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.type}
                      className={`rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                        form.payment_method === method.type
                          ? 'border-page-link bg-page-link/10'
                          : 'border-border hover:bg-page-surface-hover'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={form.payment_method === method.type}
                        onChange={() => setForm({ ...form, payment_method: method.type })}
                      />
                      <div className="flex items-center gap-2 text-sm font-medium text-page">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-page-surface text-page-link">
                          {method.type === 'crypto' ? <Coins size={15} aria-hidden="true" /> : <CreditCard size={15} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 truncate">{method.name || method.type}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {form.payment_method === 'crypto' && (
                <div className="rounded-2xl border border-page-divider bg-page-surface/50 p-4 sm:p-5 space-y-5">
                  <div className="flex items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-page-surface text-brand-500">
                      <Coins size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-page">{t('subDist.paymentMethod')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-page-muted">{t('subDist.cryptoHint')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[t('subDist.chain'), t('subDist.token'), t('subDist.payAndOpen', { symbol, price: Number(subInfo?.price || 0).toFixed(2) })].map((step, index) => (
                      <div key={`${index}-${step}`} className="flex items-center gap-2 rounded-lg bg-page-inset/60 px-3 py-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">{index + 1}</span>
                        <span className="min-w-0 truncate text-xs font-medium text-page-secondary">{step}</span>
                      </div>
                    ))}
                  </div>

                  <section aria-labelledby="sub-dist-crypto-network-title">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-500">1</span>
                      <div>
                        <h3 id="sub-dist-crypto-network-title" className="text-sm font-semibold text-page">{t('subDist.chain')}</h3>
                        <p className="text-xs text-page-muted">TRC-20 / ERC-20 / BEP-20 / PoS / SPL</p>
                      </div>
                    </div>
                    {availableCryptoChains.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {availableCryptoChains.map((chain) => {
                          const isSelected = form.chain === chain.key;
                          return (
                            <button
                              key={chain.key}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => setForm((prev) => ({ ...prev, chain: chain.key }))}
                              className={`group flex min-h-[72px] items-center gap-3 rounded-xl border p-3 text-left transition-all ${isSelected ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/20' : 'border-page-divider bg-page-surface hover:border-brand-500/40 hover:bg-page-surface-hover'}`}
                            >
                              <CryptoNetworkIcon chain={chain.key} size={40} />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-page">{chain.label}</span>
                                  <span className="shrink-0 rounded-full bg-page-inset px-2 py-0.5 text-[10px] font-medium text-page-muted">{chain.tag}</span>
                                </span>
                                <span className="mt-1 block text-xs text-page-muted">USDT / USDC</span>
                              </span>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-page-muted/40 text-transparent'}`}>
                                <Check size={13} strokeWidth={3} aria-hidden="true" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-page-divider px-3 py-3 text-xs text-page-muted">{t('当前暂未配置可用的加密货币收款网络')}</p>
                    )}
                  </section>

                  <section aria-labelledby="sub-dist-crypto-token-title">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-500">2</span>
                      <div>
                        <h3 id="sub-dist-crypto-token-title" className="text-sm font-semibold text-page">{t('subDist.token')}</h3>
                        <p className="text-xs text-page-muted">USDT / USDC</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {CRYPTO_TOKEN_OPTIONS.map((token) => {
                        const isSelected = form.token === token.key;
                        return (
                          <button
                            key={token.key}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setForm((prev) => ({ ...prev, token: token.key }))}
                            className={`flex min-h-[66px] items-center gap-3 rounded-xl border p-3 text-left transition-all ${isSelected ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/20' : 'border-page-divider bg-page-surface hover:border-brand-500/40 hover:bg-page-surface-hover'}`}
                          >
                            <CryptoTokenIcon token={token.key} size={36} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-page">{token.label}</span>
                              <span className="mt-1 block text-xs text-page-muted">USD</span>
                            </span>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-page-muted/40 text-transparent'}`}>
                              <Check size={13} strokeWidth={3} aria-hidden="true" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <div className="flex items-center gap-3 rounded-xl border border-brand-500/25 bg-brand-500/5 p-3">
                    {selectedCryptoChain && <CryptoNetworkIcon chain={selectedCryptoChain.key} size={34} />}
                    <CryptoTokenIcon token={form.token} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-page-muted">{t('subDist.paymentMethod')}</p>
                      <p className="truncate text-sm font-semibold text-page">{selectedCryptoLabel}</p>
                    </div>
                    <Network size={18} className="shrink-0 text-brand-500" aria-hidden="true" />
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting || cryptoUnavailable} className="btn-primary w-full justify-center flex items-center gap-2">
                {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                {t('subDist.payAndOpen', { symbol, price: Number(subInfo?.price || 0).toFixed(2) })}
                {!submitting && <ArrowRight size={16} aria-hidden="true" />}
              </button>

              <p className="text-xs text-page-muted">
                {t('subDist.currentUserHint', { user: user.display_name || user.username || 'User', method: currentPayMethod?.name || form.payment_method })}
              </p>
              <p className="text-xs text-page-muted">
                {t('subDist.postPayHint')}
              </p>
            </form>
          )}

          {cryptoOrder && (
            <div className={`mt-6 rounded-2xl border p-5 space-y-4 ${cryptoOrderStatus === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : cryptoOrderStatus === 'expired' ? 'border-red-500/25 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CryptoNetworkIcon chain={cryptoOrderChain} size={38} />
                  <CryptoTokenIcon token={cryptoOrderToken} size={30} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-page">{t('subDist.cryptoTitle')}</p>
                    <p className="mt-0.5 truncate text-xs text-page-muted">{cryptoOrderLabel}</p>
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cryptoOrderStatus === 'success' ? 'bg-emerald-500/15 text-page-success' : cryptoOrderStatus === 'expired' ? 'bg-red-500/10 text-page-danger' : 'bg-amber-500/15 text-page-warning'}`}>
                  {cryptoOrderStatus === 'success' ? <CheckCircle2 size={14} aria-hidden="true" /> : cryptoOrderStatus === 'expired' ? <AlertCircle size={14} aria-hidden="true" /> : <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  {cryptoOrderStatus === 'success' ? t('topup.statusSuccess') : cryptoOrderStatus === 'expired' ? t('topup.statusExpired') : t('topup.statusPending')}
                </span>
              </div>

              <p className="text-sm text-page-secondary">{cryptoOrderStatus === 'success' ? t('subDist.openedSuccess') : t('subDist.cryptoHint')}</p>

              {cryptoOrderStatus !== 'success' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/5 px-3 py-2.5 text-xs">
                  <span className="inline-flex items-center gap-2 text-page-warning">
                    <Clock3 size={15} aria-hidden="true" />
                    {cryptoOrderStatus === 'expired' ? t('topup.statusExpired') : t('topup.waitingPayment')}
                  </span>
                  <span className="font-mono text-sm font-semibold text-page-warning">{formatCryptoCountdown(cryptoTimeLeft)}</span>
                </div>
              )}

              <div className="rounded-xl border-2 border-amber-400/60 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold text-page-warning mb-2">{t('subDist.exactAmountLabel')}</p>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 text-2xl font-bold text-page-warning font-mono break-all">{cryptoOrder.amount} {cryptoOrder.token}</p>
                  <button type="button" onClick={() => copyCryptoValue(`${cryptoOrder.amount} ${cryptoOrder.token}`)} className="shrink-0 rounded-lg p-2 text-page-warning transition-colors hover:bg-amber-500/15" title={t('topup.copy')}>
                    <Copy size={17} aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-page-warning">{t('subDist.exactAmountNotice')}</p>
              </div>

              <div className="space-y-2 text-sm text-page">
                <div className="rounded-xl border border-page-divider bg-page-surface/40 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-page-muted">
                    <span>{t('subDist.wallet')} · {cryptoOrderChainMeta?.tag || cryptoOrderChain.toUpperCase()}</span>
                    <button type="button" onClick={() => copyCryptoValue(cryptoOrder.wallet)} className="rounded-lg p-1.5 text-page-muted transition-colors hover:bg-page-surface-hover hover:text-page" title={t('topup.copyWalletAddress')}>
                      <Copy size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <code className="block break-all text-xs text-page">{cryptoOrder.wallet}</code>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-page-muted">
                  <span>{t('subDist.amount')}: <strong className="font-mono text-page">{cryptoOrder.amount} {cryptoOrder.token}</strong></span>
                  <span>{t('subDist.tradeNo')}: <strong className="font-mono text-page">{cryptoOrder.trade_no}</strong></span>
                </div>
              </div>

              <p className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-page-warning">{t('subDist.exactAmountDetail')}</p>

              {cryptoOrderStatus !== 'success' && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => pollCryptoOrderStatus(cryptoOrder.trade_no, { silent: false })}
                    disabled={cryptoChecking}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-page-divider bg-page-surface px-3 py-2.5 text-sm font-medium text-page transition-colors hover:bg-page-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw size={16} className={cryptoChecking ? 'animate-spin' : ''} aria-hidden="true" />
                    {cryptoChecking ? t('topup.processing') : t('topup.checkAgain')}
                  </button>
                  {cryptoOrderCanReconcile && (
                    <button
                      type="button"
                      onClick={() => setReconcileRecord({ ...cryptoOrder, crypto_chain: cryptoOrderChain, crypto_token: cryptoOrderToken, status: cryptoOrderStatus })}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-page-warning/50 bg-amber-500/10 px-3 py-2.5 text-sm font-semibold text-page-warning transition-colors hover:bg-amber-500/20"
                    >
                      <WalletCards size={16} aria-hidden="true" />
                      {t('topup.reconcile')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-page mb-4">{t('subDist.priceCardTitle')}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-page-secondary">{t('subDist.openPrice')}</span>
                <span className="text-2xl font-bold text-page">{fmtCNY(subInfo?.price || 0)}</span>
              </div>
              <p className="text-sm text-page-secondary leading-6">{t('subDist.priceSummary')}</p>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-page mb-4">{t('subDist.ruleTitle')}</h2>
            <div className="space-y-3 text-sm text-page-secondary leading-6">
              <p>{t('subDist.rule1')}</p>
              <p>{t('subDist.rule2')}</p>
              <p>{t('subDist.rule3')}</p>
            </div>
          </div>
        </div>
      </div>
      <CryptoTopupReconcileModal
        record={reconcileRecord}
        onClose={() => setReconcileRecord(null)}
        onSuccess={async () => {
          stopCryptoPolling();
          setCryptoStatus('success');
          await refreshUser({ skipErrorHandler: true });
        }}
        successToast={t('subDist.openedSuccess')}
        successTitle={t('subDist.openedSuccess')}
        successDescription={t('subDist.postPayHint')}
      />
    </div>
  );
}
