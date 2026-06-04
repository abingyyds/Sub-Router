import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Save, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { updateUserPassword } from '../api';

const initialForm = {
  original_password: '',
  password: '',
  confirm_password: '',
};

export default function Account() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

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
    </div>
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
