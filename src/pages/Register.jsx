import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { t } = useTranslation();
  const { register, user } = useAuth();
  const { site } = useSite();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', password2: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Capture aff code from URL and persist in localStorage
  useEffect(() => {
    const affCode = new URLSearchParams(window.location.search).get('aff');
    if (affCode) {
      localStorage.setItem('dist_aff', affCode);
    }
  }, []);

  // If already logged in, redirect via component
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error(t('register.fillRequired'));
      return;
    }
    if (form.password !== form.password2) {
      toast.error(t('register.passwordMismatch'));
      return;
    }
    if (form.password.length < 8) {
      toast.error(t('register.passwordLength'));
      return;
    }
    if (form.password.length > 20) {
      toast.error(t('register.passwordLength'));
      return;
    }
    if (!agreedToTerms) {
      toast.error(t('register.agreeRequired'));
      return;
    }
    setLoading(true);
    try {
      const affCode = new URLSearchParams(window.location.search).get('aff') || localStorage.getItem('dist_aff') || '';
      const result = await register({
        username: form.username,
        password: form.password,
        email: form.email || undefined,
        aff_code: affCode || undefined,
      });
      if (result.success) {
        toast.success(t('register.accountCreated'));
        navigate('/login', { replace: true });
        return; // component may unmount — skip setLoading
      }
      // error toast is handled by api interceptor for success:false
    } catch (err) {
      // Network error handled by interceptor
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-heading font-bold text-page mb-2">{t('register.createAccount')}</h1>
            <p className="text-sm text-page-secondary">
              {site?.name ? t('register.getStartedWith', { name: site.name }) : t('register.getStartedDefault')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-page-label mb-1.5">{t('register.username')} *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input"
                placeholder={t('register.chooseUsername')}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-page-label mb-1.5">{t('register.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder={t('register.emailPlaceholder')}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-page-label mb-1.5">{t('register.password')} *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder={t('register.passwordPlaceholder')}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-page-label mb-1.5">{t('register.confirmPassword')} *</label>
              <input
                type="password"
                value={form.password2}
                onChange={(e) => setForm({ ...form, password2: e.target.value })}
                className="input"
                placeholder={t('register.repeatPassword')}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-page-divider bg-page-surface/40 p-3">
              <input
                id="dist-register-agreement"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-page-divider accent-current"
              />
              <label htmlFor="dist-register-agreement" className="text-xs leading-relaxed text-page-secondary">
                {t('register.agreePrefix')}
                <Link
                  to="/user-agreement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mx-1 font-medium text-page-link hover:underline"
                >
                  {t('legal.userAgreement')}
                </Link>
                {t('register.agreeJoin')}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mx-1 font-medium text-page-link hover:underline"
                >
                  {t('legal.privacyPolicy')}
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? t('register.creating') : t('register.createAccountBtn')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-page-secondary">
              {t('register.hasAccount')}{' '}
              <Link to="/login" className="text-page-link hover:text-page-link transition-colors font-medium">
                {t('register.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
