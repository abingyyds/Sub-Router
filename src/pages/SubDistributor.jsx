import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { createSubDistributorOrder, getSubDistributorInfo } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSite, useCurrency } from '../context/SiteContext';

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
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '2px solid var(--page-spinner-track)', borderTopColor: 'var(--page-spinner)' }}
        />
      </div>
    );
  }

  const price = Number(subInfo?.price || 0).toFixed(2);
  const rules = [t('subDist.rule1'), t('subDist.rule2'), t('subDist.rule3')];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      {/* ─── Hero banner (full-width gradient with embedded price) ─── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 mb-6 text-white"
        style={{ backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0ea5e9 100%)' }}
      >
        <div className="absolute inset-0 ai-grid-bg opacity-25 pointer-events-none" />
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.18), transparent 70%)' }}
        />

        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            {/* Title block */}
            <div className="md:max-w-md">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-medium tracking-wide mb-4 border border-white/15">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('subDist.badge')}
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight leading-[1.15]">
                {t('subDist.title')}
              </h1>
              <p className="text-sm text-blue-100/90 mt-3 leading-relaxed">
                {t('subDist.subtitle', { name: site?.name || t('subDist.defaultSiteName') })}
              </p>
            </div>

            {/* Price */}
            <div className="md:text-right shrink-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-blue-100/80 mb-1">
                {t('subDist.openPrice')}
              </p>
              <div className="flex items-baseline gap-1.5 md:justify-end">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight">¥{price}</span>
              </div>
            </div>
          </div>

          {/* Rule chips */}
          <div className="mt-7 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rules.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-white/15 backdrop-blur text-[11px] font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[13px] text-blue-50/95 leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Form card ─── */}
      <div className="glass rounded-3xl p-5 sm:p-7 md:p-8">
          {!subInfo?.enabled ? (
            <Notice
              tone="danger"
              title={t('subDist.notAvailable')}
              desc={subInfo?.disabled_reason || t('subDist.disabledFallback')}
            />
          ) : !user ? (
            <div className="rounded-2xl border border-page-divider bg-page-surface p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-page-link/10 text-page-link">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm text-page-secondary">{t('subDist.loginHint')}</p>
              <div className="flex flex-wrap gap-3 justify-center">
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
            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Section: Site basics */}
              <FormSection
                step="01"
                title={t('subDist.siteName')}
              >
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder={t('subDist.siteNamePlaceholder')}
                  required
                />

                <div className="mt-4">
                  <label className="block text-sm font-medium text-page-label mb-2">
                    {t('subDist.siteSlug')}
                  </label>
                  <div className="relative">
                    <input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                      className="input font-mono"
                      placeholder="my-sub-site"
                      required
                    />
                  </div>
                  <p className="text-xs text-page-muted mt-2">{t('subDist.siteSlugHelp')}</p>
                </div>
              </FormSection>

              {/* Section: Payment method */}
              <FormSection
                step="02"
                title={t('subDist.paymentMethod')}
              >
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {paymentMethods.map((method) => {
                    const active = form.payment_method === method.type;
                    return (
                      <label
                        key={method.type}
                        className={`relative rounded-2xl border px-4 py-3.5 cursor-pointer transition-all ${
                          active
                            ? 'border-page-link bg-page-link/10 shadow-sm'
                            : 'border-page-divider hover:border-page-link/40 hover:bg-page-surface-hover'
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          checked={active}
                          onChange={() => setForm({ ...form, payment_method: method.type })}
                        />
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-page">{method.name || method.type}</div>
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              active ? 'border-page-link' : 'border-page-divider'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full bg-page-link transition-transform ${
                                active ? 'scale-100' : 'scale-0'
                              }`}
                            />
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {form.payment_method === 'crypto' && (
                  <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-page-divider">
                    <div>
                      <label className="block text-sm font-medium text-page-label mb-2">{t('subDist.chain')}</label>
                      <select
                        value={form.chain}
                        onChange={(e) => setForm({ ...form, chain: e.target.value })}
                        className="input"
                      >
                        <option value="tron">TRON (TRC20)</option>
                        <option value="eth">Ethereum (ERC20)</option>
                        <option value="bsc">BSC (BEP20)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-page-label mb-2">{t('subDist.token')}</label>
                      <select
                        value={form.token}
                        onChange={(e) => setForm({ ...form, token: e.target.value })}
                        className="input"
                      >
                        <option value="usdt">USDT</option>
                        <option value="usdc">USDC</option>
                      </select>
                    </div>
                  </div>
                )}
              </FormSection>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full justify-center flex items-center gap-2 py-3"
                >
                  {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  {t('subDist.payAndOpen', { price })}
                </button>

                <div className="mt-3 flex items-start gap-2 text-xs text-page-muted">
                  <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-page-link" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="space-y-1">
                    <p>{t('subDist.currentUserHint', {
                      user: user.display_name || user.username || 'User',
                      method: currentPayMethod?.name || form.payment_method,
                    })}</p>
                    <p>{t('subDist.postPayHint')}</p>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Crypto pay-info block */}
          {cryptoOrder && (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <p className="text-sm font-semibold text-page">{t('subDist.cryptoTitle')}</p>
              </div>
              <p className="text-sm text-page-secondary mb-4">{t('subDist.cryptoHint')}</p>
              <div className="space-y-2.5">
                <CryptoRow label={t('subDist.wallet')} value={cryptoOrder.wallet} mono breakAll />
                <CryptoRow label={t('subDist.amount')} value={`${cryptoOrder.amount} ${cryptoOrder.token}`} mono />
                <CryptoRow label={t('subDist.tradeNo')} value={cryptoOrder.trade_no} mono breakAll />
              </div>
            </div>
          )}
      </div>

      {/* ─── Footer hint ─── */}
      <p className="text-center text-xs text-page-muted mt-6 leading-relaxed">
        {t('subDist.priceSummary')}
      </p>
    </div>
  );
}

/* ───────── helpers ───────── */

function FormSection({ step, title, children }) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-[10px] font-mono font-semibold text-page-link/80 tracking-[0.18em]">
          STEP {step}
        </span>
        <span className="flex-1 h-px bg-page-divider" />
      </div>
      <label className="block text-sm font-medium text-page-label mb-2">{title}</label>
      {children}
    </section>
  );
}

function Notice({ tone = 'danger', title, desc }) {
  const tones = {
    danger: 'border-red-500/25 bg-red-500/5',
  };
  return (
    <div className={`rounded-2xl border p-5 ${tones[tone] || tones.danger}`}>
      <p className="text-sm font-medium text-page mb-1.5">{title}</p>
      <p className="text-sm text-page-secondary leading-relaxed">{desc}</p>
    </div>
  );
}

function CryptoRow({ label, value, mono, breakAll }) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {}
  };
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="shrink-0 w-20 text-page-muted">{label}</span>
      <span className={`flex-1 text-page ${mono ? 'font-mono' : ''} ${breakAll ? 'break-all' : ''}`}>
        {value}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 text-xs text-page-link hover:underline"
        aria-label="Copy"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}
