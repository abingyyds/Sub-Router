import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { createSubDistributorOrder, getSubDistributorInfo } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSite, useCurrency } from '../context/SiteContext';

function normalizeHost(value) {
  if (!value) return '';
  return String(value).replace(/^https?:\/\//, '').replace(/\/+$/, '');
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
  const [form, setForm] = useState({
    name: '',
    slug: '',
    payment_method: '',
    chain: 'tron',
    token: 'usdt',
  });

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
  const currentPayMethod = useMemo(
    () => paymentMethods.find((item) => item.type === form.payment_method),
    [paymentMethods, form.payment_method]
  );
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

    setSubmitting(true);
    setCryptoOrder(null);
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
                      <div className="text-sm font-medium text-page">{method.name || method.type}</div>
                    </label>
                  ))}
                </div>
              </div>

              {form.payment_method === 'crypto' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-page-label mb-2">{t('subDist.chain')}</label>
                    <select value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} className="input">
                      <option value="tron">TRON (TRC20)</option>
                      <option value="eth">Ethereum (ERC20)</option>
                      <option value="bsc">BSC (BEP20)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-page-label mb-2">{t('subDist.token')}</label>
                    <select value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} className="input">
                      <option value="usdt">USDT</option>
                      <option value="usdc">USDC</option>
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center flex items-center gap-2">
                {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                {t('subDist.payAndOpen', { symbol, price: Number(subInfo?.price || 0).toFixed(2) })}
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
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
              <p className="text-sm font-medium text-page">{t('subDist.cryptoTitle')}</p>
              <p className="text-sm text-page-secondary">{t('subDist.cryptoHint')}</p>
              <div className="text-sm text-page">
                <div>{t('subDist.wallet')}: <span className="font-mono break-all">{cryptoOrder.wallet}</span></div>
                <div>{t('subDist.amount')}: <span className="font-mono">{cryptoOrder.amount} {cryptoOrder.token}</span></div>
                <div>{t('subDist.tradeNo')}: <span className="font-mono break-all">{cryptoOrder.trade_no}</span></div>
              </div>
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
    </div>
  );
}
