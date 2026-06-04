import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Lock, Save, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { createInvoice, getInvoiceHistory, getInvoiceInfo, updateUserPassword } from '../api';

const initialForm = {
  original_password: '',
  password: '',
  confirm_password: '',
};

const initialInvoiceInfo = {
  title: '',
  tax_id: '',
  email: '',
  country: '',
  address: '',
  contact_name: '',
  phone: '',
  extra: '',
};

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const getInvoiceValidationError = ({ amount, summary, info, t }) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return t('invoice.invalidAmount');
  }
  const minAmount = Number(summary?.min_amount || 1000);
  if (amount < minAmount) {
    return t('invoice.amountBelowMin', { amount: money(minAmount) });
  }
  const availableAmount = Number(summary?.available_amount || 0);
  if (amount > availableAmount) {
    return t('invoice.amountExceedsAvailable');
  }
  if (!info.title.trim()) {
    return t('invoice.titleRequired');
  }
  if (!info.email.trim()) {
    return t('invoice.emailRequired');
  }
  if (!info.country.trim()) {
    return t('invoice.countryRequired');
  }
  const normalizedCountry = info.country.trim().toLowerCase();
  if (
    normalizedCountry.includes('中国大陆') ||
    normalizedCountry.includes('中國大陸') ||
    normalizedCountry.includes('中华人民共和国') ||
    normalizedCountry.includes('中華人民共和國') ||
    normalizedCountry.includes('mainland china') ||
    normalizedCountry.includes('china mainland') ||
    normalizedCountry === '中国' ||
    normalizedCountry === '中國' ||
    normalizedCountry === 'china' ||
    normalizedCountry === 'cn' ||
    normalizedCountry === 'prc' ||
    normalizedCountry.includes('people\'s republic of china')
  ) {
    return t('invoice.mainlandUnsupported');
  }
  if (!info.address.trim()) {
    return t('invoice.addressRequired');
  }
  if (!info.contact_name.trim()) {
    return t('invoice.contactRequired');
  }
  return '';
};

export default function Account() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { site } = useSite();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [invoiceSummary, setInvoiceSummary] = useState(null);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceInfo, setInvoiceInfo] = useState(initialInvoiceInfo);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!site?.enable_invoice) {
      setInvoiceSummary(null);
      setInvoiceHistory([]);
      return;
    }
    setInvoiceLoading(true);
    try {
      const [infoRes, historyRes] = await Promise.all([
        getInvoiceInfo(),
        getInvoiceHistory({ page_size: 10 }),
      ]);
      if (infoRes.data.success) setInvoiceSummary(infoRes.data.data);
      if (historyRes.data.success) setInvoiceHistory(historyRes.data.data.items || []);
    } catch {
      // shared interceptor handles user-facing errors
    } finally {
      setInvoiceLoading(false);
    }
  }, [site?.enable_invoice]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.original_password) {
      toast.error(t('account.currentPasswordRequired'));
      return;
    }
    if (!form.password) {
      toast.error(t('account.newPasswordRequired'));
      return;
    }
    if (form.password.length < 8 || form.password.length > 20) {
      toast.error(t('account.passwordLength'));
      return;
    }
    if (form.original_password === form.password) {
      toast.error(t('account.passwordSame'));
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error(t('account.passwordMismatch'));
      return;
    }

    setSaving(true);
    try {
      const res = await updateUserPassword({
        original_password: form.original_password,
        password: form.password,
      });
      if (res.data.success) {
        toast.success(t('account.passwordUpdated'));
        setForm(initialForm);
      }
    } catch {
      // The shared API interceptor shows the user-facing error.
    } finally {
      setSaving(false);
    }
  };

  const updateInvoiceInfo = (field, value) => {
    setInvoiceInfo((current) => ({ ...current, [field]: value }));
  };

  const handleInvoiceSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(invoiceAmount);
    const validationError = getInvoiceValidationError({ amount, summary: invoiceSummary, info: invoiceInfo, t });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setInvoiceLoading(true);
    try {
      const res = await createInvoice({ amount, info: invoiceInfo });
      if (res.data.success) {
        toast.success(t('invoice.submitSuccess'));
        setInvoiceAmount('');
        setInvoiceInfo(initialInvoiceInfo);
        await loadInvoice();
      }
    } catch {
      // shared interceptor handles user-facing errors
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-page mb-1">{t('account.title')}</h1>
        <p className="text-sm text-page-secondary">{t('account.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-page-surface text-page-link">
              <UserCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-page">{user?.display_name || user?.username || '-'}</h2>
              <p className="truncate text-sm text-page-secondary">{user?.email || t('account.noEmail')}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase text-page-muted">{t('account.username')}</dt>
              <dd className="mt-1 text-sm text-page">{user?.username || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-page-muted">{t('account.userId')}</dt>
              <dd className="mt-1 text-sm text-page">{user?.id || '-'}</dd>
            </div>
          </dl>
        </section>

        <section className="glass rounded-2xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <Lock className="h-5 w-5 text-page-link" />
            <h2 className="text-lg font-semibold text-page">{t('account.changePassword')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              label={t('account.currentPassword')}
              value={form.original_password}
              onChange={(value) => handleChange('original_password', value)}
              autoComplete="current-password"
            />
            <PasswordField
              label={t('account.newPassword')}
              value={form.password}
              onChange={(value) => handleChange('password', value)}
              autoComplete="new-password"
            />
            <PasswordField
              label={t('account.confirmPassword')}
              value={form.confirm_password}
              onChange={(value) => handleChange('confirm_password', value)}
              autoComplete="new-password"
            />

            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center justify-center gap-2">
              {saving ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? t('account.saving') : t('account.savePassword')}
            </button>
          </form>
        </section>
      </div>

      {site?.enable_invoice && (
        <section className="glass rounded-2xl p-6 mt-6">
          <div className="mb-5 flex items-center gap-2">
            <FileText className="h-5 w-5 text-page-link" />
            <div>
              <h2 className="text-lg font-semibold text-page">{t('invoice.title')}</h2>
              <p className="text-sm text-page-secondary">{t('invoice.description')}</p>
              <p className="text-sm text-page-secondary">{t('invoice.feeCountsNext')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <InvoiceMetric label={t('invoice.availableUsd')} value={money(invoiceSummary?.available_amount)} />
            <InvoiceMetric label={t('invoice.minUsd')} value={money(invoiceSummary?.min_amount || 1000)} />
            <InvoiceMetric label={t('invoice.feeRate')} value={`${Number(invoiceSummary?.tax_rate || 0) * 100}%`} />
            <InvoiceMetric label={t('invoice.creemTotalUsd')} value={money(invoiceSummary?.creem_amount)} />
          </div>

          <form onSubmit={handleInvoiceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label={t('invoice.amountUsd')} type="number" value={invoiceAmount} onChange={setInvoiceAmount} />
            <TextField label={t('invoice.estimatedFeeUsd')} value={money(Number(invoiceAmount || 0) * Number(invoiceSummary?.tax_rate || 0))} disabled />
            <TextField label={t('invoice.titleField')} value={invoiceInfo.title} onChange={(v) => updateInvoiceInfo('title', v)} />
            <TextField label={t('invoice.taxId')} value={invoiceInfo.tax_id} onChange={(v) => updateInvoiceInfo('tax_id', v)} />
            <TextField label={t('invoice.email')} type="email" value={invoiceInfo.email} onChange={(v) => updateInvoiceInfo('email', v)} />
            <TextField label={t('invoice.country')} value={invoiceInfo.country} onChange={(v) => updateInvoiceInfo('country', v)} />
            <TextField label={t('invoice.contactName')} value={invoiceInfo.contact_name} onChange={(v) => updateInvoiceInfo('contact_name', v)} />
            <TextField label={t('invoice.phone')} value={invoiceInfo.phone} onChange={(v) => updateInvoiceInfo('phone', v)} />
            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-page-label mb-1.5">{t('invoice.address')}</span>
              <textarea className="input min-h-[88px]" value={invoiceInfo.address} onChange={(e) => updateInvoiceInfo('address', e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-page-label mb-1.5">{t('invoice.extra')}</span>
              <textarea className="input min-h-[88px]" value={invoiceInfo.extra} onChange={(e) => updateInvoiceInfo('extra', e.target.value)} />
            </label>
            <div className="md:col-span-2">
              <button type="submit" disabled={invoiceLoading} className="btn-primary inline-flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                {invoiceLoading ? t('invoice.submitting') : t('invoice.submitWithFee')}
              </button>
            </div>
          </form>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-page-muted">
                <tr>
                  <th className="py-2 pr-3">{t('invoice.amountHeaderUsd')}</th>
                  <th className="py-2 pr-3">{t('invoice.feeHeaderUsd')}</th>
                  <th className="py-2 pr-3">{t('invoice.statusHeader')}</th>
                  <th className="py-2 pr-3">{t('invoice.deliveryHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {invoiceHistory.length === 0 ? (
                  <tr><td colSpan={4} className="py-5 text-center text-page-secondary">{t('invoice.empty')}</td></tr>
                ) : invoiceHistory.map((item) => (
                  <tr key={item.id} className="border-t border-page-border">
                    <td className="py-3 pr-3">{money(item.amount)}</td>
                    <td className="py-3 pr-3">{money(item.tax_amount)}</td>
                    <td className="py-3 pr-3">{t(`invoice.status.${item.status}`, item.status)}</td>
                    <td className="py-3 pr-3">
                      {t('invoice.emailDelivery')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function InvoiceMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-page-border bg-page-surface/70 p-3">
      <div className="text-xs text-page-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-page">{value}</div>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-page-label mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="input"
      />
    </label>
  );
}

function PasswordField({ label, value, onChange, autoComplete }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-page-label mb-1.5">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input"
        autoComplete={autoComplete}
      />
    </label>
  );
}
