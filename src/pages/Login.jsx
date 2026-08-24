import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { LegalAgreementCheckbox } from '../components/LegalLinks';
import OAuthLoginButtons from '../components/OAuthLoginButtons';
import toast from 'react-hot-toast';

export default function Login() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const { site } = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('oauth_error');
    if (!oauthError) return;
    toast.error(oauthError);
    params.delete('oauth_error');
    const nextQuery = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${location.pathname}${nextQuery ? `?${nextQuery}` : ''}`,
    );
  }, [location.pathname, location.search]);

  // If already logged in, redirect via component (not navigate in render)
  if (user) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error(t('login.fillAllFields'));
      return;
    }
    if (!agreedToTerms) {
      toast.error(t('legal.agreeRequired'));
      return;
    }
    setLoading(true);
    try {
      const result = await login(form.username, form.password);
      if (result.success) {
        toast.success(t('login.welcomeBackToast'));
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
        return; // component may unmount — skip setLoading
      }
      // error toast is handled by api interceptor for success:false
    } catch (err) {
      // Network error handled by interceptor
    }
    setLoading(false);
  };

  return (
    <div className="auth-page-shell flex min-h-[70vh] items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="auth-card glass rounded-xl p-6 sm:p-8">
          <div className="mb-8 text-center">
            {site?.name && <p className="mb-2 truncate text-xs font-bold uppercase tracking-[0.14em] text-page-link">{site.name}</p>}
            <h1 className="mb-2 text-2xl font-heading font-bold text-page">{t('login.welcomeBack')}</h1>
            <p className="break-words text-sm text-page-secondary">
              {site?.name ? t('login.signInTo', { name: site.name }) : t('login.signInToDefault')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-page-label mb-1.5">{t('login.username')}</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input"
                placeholder={t('login.enterUsername')}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-page-label mb-1.5">{t('login.password')}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder={t('login.enterPassword')}
                autoComplete="current-password"
                required
              />
            </div>

            <LegalAgreementCheckbox
              id="dist-login-agreement"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? t('login.signingIn') : t('login.signInBtn')}
            </button>
          </form>

          <OAuthLoginButtons agreedToTerms={agreedToTerms} disabled={loading} />

          <div className="mt-6 text-center">
            <p className="text-sm text-page-secondary">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-page-link hover:text-page-link transition-colors font-medium">
                {t('login.createOne')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
