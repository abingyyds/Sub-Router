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
  mainland_china: false,
};

const statusLabel = {
  pending: '待处理',
  issued: '已开票',
  rejected: '已拒绝',
};

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

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
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('请输入有效的开票金额');
      return;
    }
    setInvoiceLoading(true);
    try {
      const res = await createInvoice({ amount, info: invoiceInfo });
      if (res.data.success) {
        toast.success('发票申请已提交');
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
              <h2 className="text-lg font-semibold text-page">开票申请</h2>
              <p className="text-sm text-page-secondary">仅支持非中国大陆主体；发票通过接收邮箱手动发送；Creem 支付请在 Creem 内自助开票。</p>
              <p className="text-sm text-page-secondary">已支付的开票手续费会计入下一次可开票消费额度。</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <InvoiceMetric label="可开票额度" value={money(invoiceSummary?.available_amount)} />
            <InvoiceMetric label="最低金额" value={money(invoiceSummary?.min_amount || 1000)} />
            <InvoiceMetric label="手续费比例" value={`${Number(invoiceSummary?.tax_rate || 0) * 100}%`} />
            <InvoiceMetric label="Creem 累计" value={money(invoiceSummary?.creem_amount)} />
          </div>

          <form onSubmit={handleInvoiceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="开票金额" type="number" value={invoiceAmount} onChange={setInvoiceAmount} />
            <TextField label="预计手续费" value={money(Number(invoiceAmount || 0) * Number(invoiceSummary?.tax_rate || 0))} disabled />
            <TextField label="发票抬头" value={invoiceInfo.title} onChange={(v) => updateInvoiceInfo('title', v)} />
            <TextField label="税号 / VAT ID" value={invoiceInfo.tax_id} onChange={(v) => updateInvoiceInfo('tax_id', v)} />
            <TextField label="接收邮箱" type="email" value={invoiceInfo.email} onChange={(v) => updateInvoiceInfo('email', v)} />
            <TextField label="国家或地区" value={invoiceInfo.country} onChange={(v) => updateInvoiceInfo('country', v)} />
            <TextField label="联系人" value={invoiceInfo.contact_name} onChange={(v) => updateInvoiceInfo('contact_name', v)} />
            <TextField label="联系电话" value={invoiceInfo.phone} onChange={(v) => updateInvoiceInfo('phone', v)} />
            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-page-label mb-1.5">注册地址 / 账单地址</span>
              <textarea className="input min-h-[88px]" value={invoiceInfo.address} onChange={(e) => updateInvoiceInfo('address', e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-page-label mb-1.5">补充说明</span>
              <textarea className="input min-h-[88px]" value={invoiceInfo.extra} onChange={(e) => updateInvoiceInfo('extra', e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-page md:col-span-2">
              <input type="checkbox" checked={invoiceInfo.mainland_china} onChange={(e) => updateInvoiceInfo('mainland_china', e.target.checked)} />
              我是中国大陆主体
            </label>
            <div className="md:col-span-2">
              <button type="submit" disabled={invoiceLoading} className="btn-primary inline-flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                {invoiceLoading ? '提交中...' : '提交并支付手续费'}
              </button>
            </div>
          </form>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-page-muted">
                <tr>
                  <th className="py-2 pr-3">金额</th>
                  <th className="py-2 pr-3">手续费</th>
                  <th className="py-2 pr-3">状态</th>
                  <th className="py-2 pr-3">发送方式</th>
                </tr>
              </thead>
              <tbody>
                {invoiceHistory.length === 0 ? (
                  <tr><td colSpan={4} className="py-5 text-center text-page-secondary">暂无开票记录</td></tr>
                ) : invoiceHistory.map((item) => (
                  <tr key={item.id} className="border-t border-page-border">
                    <td className="py-3 pr-3">{money(item.amount)}</td>
                    <td className="py-3 pr-3">{money(item.tax_amount)}</td>
                    <td className="py-3 pr-3">{statusLabel[item.status] || item.status}</td>
                    <td className="py-3 pr-3">
                      邮件发送
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
