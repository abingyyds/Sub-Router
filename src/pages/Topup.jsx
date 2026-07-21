import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { ExternalLink, TicketPercent } from 'lucide-react';
import {
  getUserUsage, redeemCode, getTopupInfo,
  createEpayOrder, createStripeOrder, createCreemOrder,
  createCryptoOrder, getCryptoOrderStatus, getTopupHistory,
  Q,
} from '../api';
import { useCurrency } from '../context/SiteContext';
import CountUp from '../components/bits/CountUp';
import toast from 'react-hot-toast';

function normalizeExternalUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return '';
    if (parsed.host.includes(':') && !parsed.port && !parsed.host.startsWith('[')) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

function normalizePaymentLabel(value) {
  const label = String(value || '').trim();
  return Array.from(label).slice(0, 32).join('');
}

function normalizeCreemProducts(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed)
      ? parsed.filter((product) => product?.productId && Number(product?.quota) > 0)
      : [];
  } catch {
    return [];
  }
}

function getCreemMinTopup(products) {
  const quotas = products
    .map((product) => Number(product?.quota))
    .filter((quota) => Number.isFinite(quota) && quota > 0);
  return quotas.length > 0 ? Math.min(...quotas) : 1;
}

function findCompatibleCreemProduct(products, amount, currency = '') {
  const payAmount = Number(amount);
  if (!Number.isFinite(payAmount) || payAmount <= 0) return null;
  const expectedCurrency = String(currency || '').trim().toUpperCase();
  return products.find((product) => {
    const quota = Number(product?.quota);
    const productCurrency = String(product?.currency || 'USD').trim().toUpperCase();
    return (!expectedCurrency || productCurrency === expectedCurrency) && quota > 0 && payAmount % quota === 0;
  }) || null;
}

const paymentWindowPlaceholderHtml =
  '<!doctype html><title>Opening payment...</title><body style="font-family: system-ui, sans-serif; padding: 24px;">Opening payment...</body>';

function shouldUseSameTabPaymentRedirect() {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return (
    /Android|iPhone|iPad|iPod|Mobile|MicroMessenger|FBAN|FBAV|Instagram/i.test(userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia?.('(max-width: 768px)').matches)
  );
}

function openPendingPaymentWindow() {
  if (shouldUseSameTabPaymentRedirect()) return null;
  try {
    const paymentWindow = window.open('', '_blank');
    if (paymentWindow) {
      paymentWindow.document.write(paymentWindowPlaceholderHtml);
      paymentWindow.document.close();
    }
    return paymentWindow;
  } catch {
    return null;
  }
}

function redirectPaymentWindow(paymentWindow, url) {
  if (!url) return false;
  if (paymentWindow && !paymentWindow.closed) {
    paymentWindow.location.href = url;
    paymentWindow.focus?.();
    return true;
  }
  window.location.assign(url);
  return true;
}

function closePendingPaymentWindow(paymentWindow) {
  if (paymentWindow && !paymentWindow.closed) {
    paymentWindow.close();
  }
}

export default function Topup() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { site } = useSite();
  const { symbol, rate, code } = useCurrency();

  const [usage, setUsage] = useState(null);
  const [topupInfo, setTopupInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Redeem code
  const [redeemInput, setRedeemInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  // Online topup
  const [amount, setAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [payingMethod, setPayingMethod] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  // Crypto modal
  const [cryptoOrder, setCryptoOrder] = useState(null);
  const [cryptoPolling, setCryptoPolling] = useState(false);
  const [selectedChain, setSelectedChain] = useState('');
  const [selectedToken, setSelectedToken] = useState('usdt');

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const enableTopup = site?.enable_topup && topupInfo;
  const topupConfig = site?.topup_config;
  const topupCurrency = String(topupInfo?.currency || code || 'CNY').toUpperCase();
  const topupSymbol = topupCurrency === 'USD' ? '$' : '¥';
  const configuredTopupRate = Number(topupInfo?.exchange_rate);
  const topupRate = Number.isFinite(configuredTopupRate) && configuredTopupRate > 0
    ? configuredTopupRate
    : topupCurrency === code
      ? rate
      : topupCurrency === 'USD'
        ? 1
        : rate;
  const amountTiers = useMemo(() => {
    if (Array.isArray(topupInfo?.amount_tiers) && topupInfo.amount_tiers.length > 0) {
      return topupInfo.amount_tiers
        .map((tier) => ({
          amount: Number(tier?.amount),
          bonus: Math.max(0, Number(tier?.bonus) || 0),
          creem_supported: tier?.creem_supported !== false,
          creem_product_id: String(tier?.creem_product_id || ''),
        }))
        .filter((tier) => Number.isFinite(tier.amount) && tier.amount > 0);
    }
    return (topupInfo?.amount_options || [1, 10, 50, 100, 200, 500]).map((value) => ({
      amount: Number(value) * topupRate,
      bonus: 0,
      creem_supported: true,
    }));
  }, [topupInfo?.amount_options, topupInfo?.amount_tiers, topupRate]);
  const selectedTier = selectedPreset === null ? null : amountTiers[selectedPreset];
  const minTopup = topupInfo?.min_topup || 1;
  const payMethods = topupInfo?.pay_methods || [];
  const enableOnline = topupInfo?.enable_online_topup;
  const enableStripe = topupInfo?.enable_stripe_topup;
  const enableCreem = topupInfo?.enable_creem_topup;
  const enableCrypto = topupInfo?.enable_crypto_topup;
  const redeemCodeShopUrl = useMemo(
    () => normalizeExternalUrl(site?.top_up_link || topupConfig?.top_up_link || topupInfo?.top_up_link),
    [site?.top_up_link, topupConfig?.top_up_link, topupInfo?.top_up_link],
  );
  const redeemCodeShopLabel = useMemo(
    () => normalizePaymentLabel(site?.top_up_link_name || topupConfig?.top_up_link_name || topupInfo?.top_up_link_name) || t('topup.otherPayment'),
    [site?.top_up_link_name, topupConfig?.top_up_link_name, topupInfo?.top_up_link_name, t],
  );

  const openRedeemCodeShop = useCallback(() => {
    if (!redeemCodeShopUrl) return;
    window.open(redeemCodeShopUrl, '_blank', 'noopener,noreferrer');
  }, [redeemCodeShopUrl]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usageRes, topupRes] = await Promise.all([
        getUserUsage(),
        site?.enable_topup ? getTopupInfo().catch(() => null) : Promise.resolve(null),
      ]);
      if (usageRes.data.success) setUsage(usageRes.data.data);
      if (topupRes?.data?.data) setTopupInfo(topupRes.data.data);
    } catch (e) { /* interceptor */ }
    setLoading(false);
  }, [site?.enable_topup]);

  useEffect(() => { loadData(); }, [loadData]);

  const quota = usage?.quota ?? user?.quota ?? 0;
  const usedQuota = usage?.used_quota ?? user?.used_quota ?? 0;
  const packageUsedQuota = usage?.package_used_quota ?? user?.package_used_quota ?? 0;
  const requestCount = usage?.request_count ?? user?.request_count ?? 0;
  const balanceDollars = quota / Q * rate;

  const formatCurrencyAmount = useCallback((value) => {
    if (value === '' || value == null || Number.isNaN(Number(value))) return '';
    return Number(value).toFixed(2).replace(/\.?0+$/, '');
  }, []);

  // Redeem
  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!redeemInput.trim()) return;
    setRedeeming(true);
    try {
      const res = await redeemCode(redeemInput.trim());
      if (res.data.success) {
        toast.success(t('topup.redeemSuccess'));
        setRedeemInput('');
        await Promise.all([loadData(), refreshUser()]);
      }
    } catch (err) { /* interceptor */ }
    setRedeeming(false);
  };

  // Select preset
  const handlePreset = (tier, index) => {
    setSelectedPreset(index);
    setAmount(String(tier.amount));
  };

  // Determine if a payment method is Stripe-based
  const isStripePayment = (method) =>
    ['stripe', 'alipay', 'wxpay'].includes(method) && !method.startsWith('epay_');

  const isCreemPayment = (method) => method === 'creem';

  const getMethodMinTopup = (method) => {
    const payMethod = (payMethods || []).find((item) => item.type === method);
    const methodMinTopup = Number(payMethod?.min_topup);
    if (Number.isFinite(methodMinTopup) && methodMinTopup > 0) return methodMinTopup;
    if (isCreemPayment(method)) {
      const configuredMin = Number(topupInfo?.creem_min_topup);
      return Number.isFinite(configuredMin) && configuredMin > 0
        ? configuredMin
        : getCreemMinTopup(normalizeCreemProducts(topupInfo?.creem_products));
    }
    if (isStripePayment(method)) {
      const stripeMin = Number(topupInfo?.stripe_min_topup);
      if (Number.isFinite(stripeMin) && stripeMin > 0) return stripeMin;
    }
    return minTopup;
  };

  const getMethodDisplayName = (method) => {
    const payMethod = (payMethods || []).find((item) => item.type === method);
    return payMethod?.name || (method === 'creem' ? 'Creem' : 'Stripe');
  };

  const showGatewayMinTopupError = (method, minAmount) => {
    toast.error(t('topup.gatewayMinimumAmount', {
      channel: getMethodDisplayName(method),
      amount: formatCurrencyAmount(minAmount),
    }));
  };

  // Pay handler for EPay, Stripe and Creem methods
  const handlePay = async (method) => {
    setSelectedPaymentMethod(method);
    const payAmount = Number.parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      toast.error(t('topup.enterAmount'));
      return;
    }
    const basePayAmount = payAmount / topupRate;
    const isGatewayPayment = isStripePayment(method) || isCreemPayment(method);
    if (isGatewayPayment && basePayAmount < getMethodMinTopup(method)) {
      showGatewayMinTopupError(method, getMethodMinTopup(method));
      return;
    }
    if (!isGatewayPayment && basePayAmount < minTopup) {
      toast.error(t('topup.minimumAmount', { min: `${topupSymbol}${formatCurrencyAmount(minTopup * topupRate)}` }));
      return;
    }
    const creemProduct = isCreemPayment(method)
      ? selectedTier?.creem_product_id
        ? creemProducts.find((product) => product.productId === selectedTier.creem_product_id) || null
        : selectedPreset === null && Math.abs(basePayAmount - Math.round(basePayAmount)) > 0.000001
          ? null
          : findCompatibleCreemProduct(
              creemProducts,
              Math.round(basePayAmount),
              selectedPreset === null ? '' : topupInfo?.currency,
            )
      : null;
    if (isCreemPayment(method) && (selectedTier?.creem_supported === false || !creemProduct)) {
      toast.error(t('topup.creemUnsupportedAmount') || 'Current amount is not supported by Creem');
      return;
    }
    const paymentWindow = isCreemPayment(method) ? openPendingPaymentWindow() : null;
    setPaymentLoading(true);
    setPayingMethod(method);
    try {
      const returnUrl = window.location.origin + '/topup?payment=return';
      const data = {
        amount: payAmount,
        payment_method: method,
        return_url: returnUrl,
        currency: topupCurrency,
        ...(selectedPreset !== null ? { tier_index: selectedPreset } : {}),
      };

      if (isCreemPayment(method)) {
        const res = await createCreemOrder({
          product_id: creemProduct.productId,
          payment_method: 'creem',
          amount: payAmount,
          currency: topupCurrency,
          ...(selectedPreset !== null ? { tier_index: selectedPreset } : {}),
          return_url: returnUrl,
        });
        if (res.data.message === 'success' && res.data.data?.checkout_url) {
          redirectPaymentWindow(paymentWindow, res.data.data.checkout_url);
        } else if (res.data.message === 'success') {
          closePendingPaymentWindow(paymentWindow);
          toast.error(t('common.requestFailed'));
        } else if (res.data.message !== 'success') {
          closePendingPaymentWindow(paymentWindow);
          const errMsg = typeof res.data.data === 'string' ? res.data.data : res.data.message;
          toast.error(errMsg || t('common.requestFailed'));
        }
      } else if (isStripePayment(method)) {
        // Stripe payment
        const res = await createStripeOrder(data);
        if (res.data.message === 'success' && res.data.data?.pay_link) {
          window.open(res.data.data.pay_link, '_blank');
        } else if (res.data.message !== 'success') {
          const errMsg = typeof res.data.data === 'string' ? res.data.data : res.data.message;
          toast.error(errMsg || t('common.requestFailed'));
        }
      } else {
        // EPay payment - submit via hidden form (same as main site)
        const res = await createEpayOrder(data);
        if (res.data.message === 'success') {
          const params = res.data.data; // EPay form params
          const url = res.data.url;     // EPay gateway URL
          if (url && params) {
            const form = document.createElement('form');
            form.action = url;
            form.method = 'POST';
            // Open in new tab (except Safari)
            const isSafari = navigator.userAgent.indexOf('Safari') > -1
              && navigator.userAgent.indexOf('Chrome') < 1;
            if (!isSafari) {
              form.target = '_blank';
            }
            for (const key in params) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = params[key];
              form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
          }
        } else {
          const errMsg = typeof res.data.data === 'string' ? res.data.data : res.data.message;
          toast.error(errMsg || t('common.requestFailed'));
        }
      }
    } catch (e) {
      closePendingPaymentWindow(paymentWindow);
      /* interceptor */
    }
    setPaymentLoading(false);
    setPayingMethod('');
  };

  // Crypto pay - needs chain + token
  const handleCryptoPay = async () => {
    const payAmountVal = Number.parseFloat(amount);
    if (!payAmountVal || payAmountVal <= 0) {
      toast.error(t('topup.enterAmount'));
      return;
    }
    if (!selectedChain) {
      toast.error(t('topup.selectChain'));
      return;
    }
    if (!selectedToken) {
      toast.error(t('topup.selectToken'));
      return;
    }
    setPaymentLoading(true);
    setPayingMethod('crypto');
    try {
      const res = await createCryptoOrder({
        amount: payAmountVal,
        chain: selectedChain,
        token: selectedToken,
        currency: topupCurrency,
        ...(selectedPreset !== null ? { tier_index: selectedPreset } : {}),
      });
      if (res.data.message === 'success' && res.data.data) {
        setCryptoOrder(res.data.data);
        startCryptoPolling(res.data.data.trade_no);
      } else if (res.data.message !== 'success') {
        const errMsg = typeof res.data.data === 'string' ? res.data.data : res.data.message;
        toast.error(errMsg || t('common.requestFailed'));
      }
    } catch (e) { /* interceptor */ }
    setPaymentLoading(false);
    setPayingMethod('');
  };

  const startCryptoPolling = (tradeNo) => {
    setCryptoPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await getCryptoOrderStatus(tradeNo);
        if (res.data.data?.status === 'success') {
          clearInterval(interval);
          setCryptoPolling(false);
          setCryptoOrder(null);
          toast.success(t('topup.paymentSuccess'));
          await Promise.all([loadData(), refreshUser()]);
        } else if (res.data.data?.status === 'expired') {
          clearInterval(interval);
          setCryptoPolling(false);
          toast.error(t('topup.orderExpired'));
        }
      } catch (e) {
        clearInterval(interval);
        setCryptoPolling(false);
      }
    }, 5000);
    // Auto-stop after expiry time
    const expiryMs = (topupInfo?.crypto_expiry_minutes || 30) * 60 * 1000;
    setTimeout(() => { clearInterval(interval); setCryptoPolling(false); }, expiryMs);
  };

  // Available crypto chains from config
  const cryptoWallets = topupInfo?.crypto_wallets || {};
  const availableChains = useMemo(() => {
    const chains = [];
    if (cryptoWallets.tron) chains.push({ key: 'tron', label: 'TRON (TRC20)' });
    if (cryptoWallets.eth) chains.push({ key: 'eth', label: 'Ethereum (ERC20)' });
    if (cryptoWallets.bsc) chains.push({ key: 'bsc', label: 'BSC (BEP20)' });
    return chains;
  }, [cryptoWallets.tron, cryptoWallets.eth, cryptoWallets.bsc]);
  const selectedChainMeta = useMemo(
    () => availableChains.find((chain) => chain.key === selectedChain) || null,
    [availableChains, selectedChain],
  );
  const selectedChainLabel = selectedChainMeta?.label || '';
  const selectedTokenLabel = selectedToken.toUpperCase();
  const selectedCryptoLabel = selectedChainLabel
    ? `${selectedTokenLabel} (${selectedChainLabel})`
    : selectedTokenLabel;
  const showCryptoOptions = selectedPaymentMethod === 'crypto' && enableCrypto && availableChains.length > 0;

  // Set default chain when available
  useEffect(() => {
    if (availableChains.length > 0 && !selectedChain) {
      setSelectedChain(availableChains[0].key);
    }
  }, [availableChains, selectedChain]);

  // Parse Creem products
  const creemProducts = useMemo(() => {
    return normalizeCreemProducts(topupInfo?.creem_products);
  }, [topupInfo?.creem_products]);

  const creemMinTopup = useMemo(() => {
    const configuredMin = Number(topupInfo?.creem_min_topup);
    return Number.isFinite(configuredMin) && configuredMin > 0
      ? configuredMin
      : getCreemMinTopup(creemProducts);
  }, [topupInfo?.creem_min_topup, creemProducts]);

  // History
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getTopupHistory({ page: 1, page_size: 20 });
      if (res.data.data?.items) {
        setHistory(res.data.data.items);
      }
    } catch (e) { /* interceptor */ }
    setHistoryLoading(false);
  };

  const topupPayMethods = useMemo(() => {
    const methods = (payMethods || [])
      .filter((m) => m?.type && m.type !== 'crypto')
      .map((method) => {
        if (isStripePayment(method.type) && (!method.min_topup || Number(method.min_topup) <= 0)) {
          const stripeMin = Number(topupInfo?.stripe_min_topup);
          if (Number.isFinite(stripeMin) && stripeMin > 0) {
            return { ...method, min_topup: stripeMin };
          }
        }
        if (method.type === 'creem' && (!method.min_topup || Number(method.min_topup) <= 0)) {
          return { ...method, min_topup: creemMinTopup };
        }
        return method;
      });

    if (enableCreem && creemProducts.length > 0 && !methods.some((method) => method.type === 'creem')) {
      methods.push({
        name: 'Creem',
        type: 'creem',
        min_topup: creemMinTopup,
      });
    }
    return methods;
  }, [payMethods, enableCreem, creemProducts, creemMinTopup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-page mb-1">{t('topup.title')}</h1>
        <p className="text-sm text-page-secondary">{t('topup.subtitle')}</p>
      </div>

      {/* Balance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-page-secondary mb-2">{t('dashboard.balance')}</p>
          <div className="text-3xl font-bold text-page">
            {symbol}<CountUp from={0} to={balanceDollars} duration={1.5} decimals={2} />
          </div>
          <p className="text-xs text-page-muted mt-1">{t('dashboard.quotaUnits', { count: quota.toLocaleString() })}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-page-secondary mb-2">{t('dashboard.used')}</p>
          <div className="text-3xl font-bold text-page">
            {symbol}<CountUp from={0} to={usedQuota / Q * rate} duration={1.5} decimals={2} />
          </div>
          <p className="text-xs text-page-muted mt-1">{t('dashboard.quotaUnits', { count: usedQuota.toLocaleString() })}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-page-secondary mb-2">{t('dashboard.packageUsed')}</p>
          <div className="text-3xl font-bold text-page">
            {symbol}<CountUp from={0} to={packageUsedQuota / Q * rate} duration={1.5} decimals={2} />
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

      {/* Online Topup */}
      {site?.enable_topup && (enableOnline || enableStripe || enableCreem || enableCrypto || redeemCodeShopUrl) && (topupPayMethods.length > 0 || enableCrypto || redeemCodeShopUrl) && (
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-page">{t('topup.onlineTopup')}</h2>
            <button
              onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
              className="text-sm text-page-secondary hover:text-page transition-colors"
            >
              {showHistory ? t('topup.hideHistory') : t('topup.viewHistory')}
            </button>
          </div>

          {/* Preset Amounts */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-page-label mb-3">{t('topup.selectAmount')}</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {amountTiers.map((tier, index) => (
                <button
                  key={`${tier.amount}-${index}`}
                  onClick={() => handlePreset(tier, index)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                    selectedPreset === index
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                      : 'glass-sm text-page-label hover:text-page hover:bg-page-surface-hover'
                  }`}
                >
                  <span className='block'>{topupSymbol}{formatCurrencyAmount(tier.amount)}</span>
                  {tier.bonus > 0 && (
                    <span className={`block mt-0.5 text-[11px] ${selectedPreset === index ? 'text-white/85' : 'text-page-success'}`}>
                      {t('topup.bonusAmount', { amount: `${topupSymbol}${formatCurrencyAmount(tier.bonus)}` })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className='mb-6'>
            <label className='block text-sm font-medium text-page-label mb-2'>{t('topup.customAmount')}</label>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-page-muted'>{topupSymbol}</span>
              <input
                type='number'
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setSelectedPreset(null);
                }}
                min={minTopup * topupRate}
                max={10000 * topupRate}
                step='0.01'
                placeholder={t('topup.amountPlaceholder', {
                  min: `${topupSymbol}${formatCurrencyAmount(minTopup * topupRate)}`,
                })}
                className='input w-full pl-8'
              />
            </div>
            <p className='text-xs text-page-muted mt-2'>{t('topup.customAmountHint')}</p>
          </div>

          {selectedTier && (
            <div className='mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-page-secondary'>
              <span>{t('topup.rechargeAmountLabel')}: {topupSymbol}{formatCurrencyAmount(selectedTier.amount)}</span>
              {selectedTier.bonus > 0 && (
                <span className='font-medium text-page-success'>
                  {t('topup.creditedAmount')}: {topupSymbol}{formatCurrencyAmount(selectedTier.amount + selectedTier.bonus)}
                </span>
              )}
            </div>
          )}

          {/* Payment Methods */}
          <div>
            <label className="block text-sm font-medium text-page-label mb-3">{t('topup.paymentMethod')}</label>
            <div className="flex flex-wrap gap-2">
              {topupPayMethods.map((method) => {
                const isCurrentLoading = paymentLoading && payingMethod === method.type;
                const isMethodStripe = isStripePayment(method.type);
                const isMethodCreem = isCreemPayment(method.type);
                const minForMethod = Number(method.min_topup) || 0;
                const baseAmount = Number(amount || 0) / topupRate;
                const belowGatewayMin =
                  (isMethodStripe || isMethodCreem) &&
                  minForMethod > baseAmount;
                const creemTierUnsupported =
                  isMethodCreem && selectedTier?.creem_supported === false;
                const disabled =
                  paymentLoading ||
                  !amount ||
                  (!enableOnline && !isMethodStripe && !isMethodCreem) ||
                  (!enableStripe && isMethodStripe) ||
                  (!enableCreem && isMethodCreem) ||
                  creemTierUnsupported;
                return (
                  <button
                    key={method.type}
                    onClick={() => handlePay(method.type)}
                    disabled={disabled}
                    title={
                      creemTierUnsupported
                        ? t('topup.creemUnsupportedAmount')
                        : belowGatewayMin
                        ? t('topup.gatewayMinimumAmount', {
                            channel: method.name,
                            amount: formatCurrencyAmount(minForMethod),
                          })
                        : undefined
                    }
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      selectedPaymentMethod === method.type
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                        : 'glass-sm text-page-label hover:text-page hover:bg-page-surface-hover'
                    }`}
                  >
                    {isCurrentLoading ? t('topup.processing') : method.name}
                  </button>
                );
              })}
              {enableCrypto && availableChains.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('crypto')}
                  disabled={paymentLoading}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedPaymentMethod === 'crypto'
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                      : 'glass-sm text-page-label hover:text-page hover:bg-page-surface-hover'
                  }`}
                >
                  {t('topup.cryptoPayment')}
                </button>
              )}
              {redeemCodeShopUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod('external');
                    openRedeemCodeShop();
                  }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedPaymentMethod === 'external'
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                      : 'glass-sm text-page-label hover:text-page hover:bg-page-surface-hover'
                  }`}
                >
                  {redeemCodeShopLabel}
                </button>
              )}
            </div>
          </div>

          {/* Crypto Payment */}
          {showCryptoOptions && (
            <div className="mt-6 pt-6 border-t border-page-divider">
              <label className="block text-sm font-medium text-page-label mb-3">{t('topup.cryptoPayment')}</label>
              <div className="rounded-xl border border-page-divider bg-page-surface/50 p-4 space-y-4">
                <p className="text-xs text-page-muted">
                  {t('topup.cryptoSelectionHint')}
                </p>

                <div>
                  <p className="text-xs font-medium text-page-label mb-2">
                    {t('topup.cryptoStepChain')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableChains.map((chain) => (
                      <button
                        key={chain.key}
                        onClick={() => setSelectedChain(chain.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedChain === chain.key
                            ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                            : 'glass-sm text-page-label hover:text-page hover:bg-page-surface-hover'
                        }`}
                      >
                        {chain.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-page-label mb-2">
                    {t('topup.cryptoStepToken')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['usdt', 'usdc'].map((token) => (
                      <button
                        key={token}
                        onClick={() => setSelectedToken(token)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedToken === token
                            ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                            : 'glass-sm text-page-label hover:text-page hover:bg-page-surface-hover'
                        }`}
                      >
                        {token.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-page-inset/60 px-3 py-3">
                  <p className="text-[11px] text-page-muted mb-1">
                    {t('topup.cryptoSelectedSummary')}
                  </p>
                  <p className="text-sm font-medium text-page">
                    {selectedCryptoLabel}
                  </p>
                </div>

                <button
                  onClick={handleCryptoPay}
                  disabled={paymentLoading || !amount}
                  className="btn-primary w-full justify-center flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {paymentLoading && payingMethod === 'crypto' ? (
                    t('topup.processing')
                  ) : (
                    t('topup.generateCryptoAddress', { method: selectedCryptoLabel })
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Crypto Payment Modal */}
      {cryptoOrder && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCryptoOrder(null)}>
          <div className="glass rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-page mb-4">{t('topup.cryptoPayment')}</h3>
            <div className="space-y-4">
              <div className="glass-sm rounded-xl p-4">
                <p className="text-xs text-page-secondary mb-1">{t('topup.walletAddress')}</p>
                <p className="text-sm text-page font-mono break-all">{cryptoOrder.wallet}</p>
              </div>
              <div className="rounded-xl border-2 border-amber-400/60 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold text-page-warning mb-2">{t('topup.exactAmountLabel')}</p>
                <p className="text-2xl font-bold text-page-warning font-mono break-all">{cryptoOrder.amount} {cryptoOrder.token}</p>
                <p className="mt-2 text-xs leading-relaxed text-page-warning">{t('topup.exactAmountNotice')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-sm rounded-xl p-3">
                  <p className="text-xs text-page-secondary mb-1">{t('topup.amount')}</p>
                  <p className="text-sm text-page font-medium font-mono">{cryptoOrder.amount} {cryptoOrder.token}</p>
                </div>
                <div className="glass-sm rounded-xl p-3">
                  <p className="text-xs text-page-secondary mb-1">{t('topup.chain')}</p>
                  <p className="text-sm text-page font-medium">{selectedChainLabel || cryptoOrder.chain}</p>
                </div>
              </div>
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-page-warning">
                {t('topup.exactAmountDetail')}
              </div>
              {cryptoPolling && (
                <div className="flex items-center gap-2 text-sm text-page-secondary">
                  <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                  {t('topup.waitingPayment')}
                </div>
              )}
              <button
                onClick={() => { setCryptoOrder(null); setCryptoPolling(false); }}
                className="w-full py-2 rounded-xl text-sm glass-sm text-page-secondary hover:text-page transition-colors"
              >
                {t('topup.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-page mb-4">{t('topup.history')}</h2>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-page-muted text-center py-8">{t('topup.noHistory')}</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => (
                <div key={i} className="flex items-center justify-between glass-sm rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm text-page">
                      {item.currency === 'USD' ? '$' : item.currency === 'CNY' ? '¥' : topupSymbol}
                      {Number(item.display_amount) > 0
                        ? formatCurrencyAmount(item.display_amount)
                        : formatCurrencyAmount(Number(item.amount) * topupRate)}
                      {Number(item.bonus_amount) > 0 && (
                        <span className='ml-2 text-xs font-medium text-page-success'>
                          {t('topup.bonusAmount', {
                            amount: `${item.currency === 'USD' ? '$' : item.currency === 'CNY' ? '¥' : topupSymbol}${formatCurrencyAmount(item.bonus_amount)}`,
                          })}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-page-muted">
                      {new Date(item.create_time * 1000).toLocaleString()} · {item.payment_method || t('topup.redeemCode')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === 'success'
                      ? 'bg-green-500/10 text-page-success'
                      : item.status === 'pending'
                        ? 'bg-yellow-500/10 text-page-warning'
                        : 'bg-red-500/10 text-page-danger'
                  }`}>
                    {item.status === 'success' ? t('topup.statusSuccess') : item.status === 'pending' ? t('topup.statusPending') : t('topup.statusFailed')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Redeem Code */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-page">{t('topup.redeemTitle')}</h2>
            <p className="mt-1 text-sm text-page-secondary">
              {redeemCodeShopUrl ? t('topup.redeemShopHint') : t('topup.redeemHint')}
            </p>
          </div>
          {redeemCodeShopUrl && (
            <a
              href={redeemCodeShopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600"
            >
              <TicketPercent size={16} />
              {t('topup.buyRedeemCode')}
              <ExternalLink size={14} />
            </a>
          )}
        </div>
        <form onSubmit={handleRedeem} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={redeemInput}
            onChange={(e) => setRedeemInput(e.target.value)}
            className="input flex-1"
            placeholder={t('topup.enterRedeemCode')}
          />
          <button type="submit" disabled={redeeming} className="btn-primary justify-center whitespace-nowrap">
            {redeeming ? t('topup.redeeming') : t('topup.redeem')}
          </button>
        </form>
      </div>
    </div>
  );
}
