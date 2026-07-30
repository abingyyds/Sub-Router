import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { LegalAgreementCheckbox } from '../components/LegalLinks';
import OAuthLoginButtons from '../components/OAuthLoginButtons';
import toast from 'react-hot-toast';
import { sendRegistrationEmailVerification } from '../api';

export default function Register() {
  const { t } = useTranslation();
  const { register, user } = useAuth();
  const { site } = useSite();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    verification_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const emailVerificationRequired = Boolean(site?.registration_email_verification_enabled);

  // Capture aff code from URL and persist in localStorage
  useEffect(() => {
    const affCode = new URLSearchParams(window.location.search).get('aff');
    if (affCode) {
      localStorage.setItem('dist_aff', affCode);
    }
  }, []);

  useEffect(() => {
    if (verificationCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setVerificationCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [verificationCooldown]);

  const handleSendVerification = async () => {
    if (!form.email) {
      toast.error(t('register.emailRequired'));
      return;
    }
    setVerificationLoading(true);
    try {
      const res = await sendRegistrationEmailVerification(form.email);
      if (res.data.success) {
        toast.success(t('register.codeSent'));
        setVerificationCooldown(60);
      }
    } catch {
      // The shared API interceptor shows the user-facing error.
    } finally {
      setVerificationLoading(false);
    }
  };

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
    if (emailVerificationRequired && (!form.email || !form.verification_code)) {
      toast.error(t('register.emailVerificationRequired'));
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
      toast.error(t('legal.agreeRequired'));
      return;
    }
    setLoading(true);
    try {
      const affCode = new URLSearchParams(window.location.search).get('aff') || localStorage.getItem('dist_aff') || '';
      const result = await register({
        username: form.username,
        password: form.password,
        email: form.email || undefined,
        verification_code: emailVerificationRequired ? form.verification_code : undefined,
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
              <label className="block text-sm font-medium text-page-label mb-1.5">
                {t('register.email')}
                {emailVerificationRequired ? ' *' : ''}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder={emailVerificationRequired ? t('register.emailRequiredPlaceholder') : t('register.emailPlaceholder')}
                autoComplete="email"
                required={emailVerificationRequired}
              />
            </div>

            {emailVerificationRequired && (
              <div>
                <label className="block text-sm font-medium text-page-label mb-1.5">{t('register.verificationCode')} *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.verification_code}
                    onChange={(e) => setForm({ ...form, verification_code: e.target.value })}
                    className="input min-w-0 flex-1"
                    placeholder={t('register.verificationCodePlaceholder')}
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                  />
                  <button type="button" onClick={handleSendVerification} disabled={verificationLoading || verificationCooldown > 0 || !form.email} className="btn-secondary whitespace-nowrap px-4">
                    {verificationLoading
                      ? t('register.sendingCode')
                      : verificationCooldown > 0
                        ? t('register.resendIn', {
                            seconds: verificationCooldown,
                          })
                        : t('register.sendCode')}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-page-muted">{t('register.verificationHint')}</p>
              </div>
            )}

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

            <LegalAgreementCheckbox
              id="dist-register-agreement"
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
              {loading ? t('register.creating') : t('register.createAccountBtn')}
            </button>
          </form>

          <OAuthLoginButtons agreedToTerms={agreedToTerms} disabled={loading} />

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
