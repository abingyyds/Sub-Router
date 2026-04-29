import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import LanguageSwitch from '../../components/LanguageSwitch';

export default function AILayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { site } = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const siteName = site?.name || 'AI Platform';

  const navItems = [
    { to: '/', label: t('nav.home'), auth: false },
    { to: '/pricing', label: t('nav.pricing'), auth: false },
    { to: '/packages', label: t('nav.packages'), auth: false },
    ...(site?.allow_sub_dist ? [{ to: '/sub-site', label: t('subDist.nav'), auth: false }] : []),
    { to: '/dashboard', label: t('nav.dashboard'), auth: true },
    { to: '/tokens', label: t('nav.apiKeys'), auth: true },
    { to: '/logs', label: t('nav.logs'), auth: true },
    ...(site?.enable_topup ? [{ to: '/topup', label: t('nav.topup'), auth: true }] : []),
  ];

  const visibleNavItems = navItems.filter((n) => !n.auth || user);

  const isActive = (to) => location.pathname === to;

  return (
    <div className="theme-light min-h-screen flex flex-col text-slate-900" style={{ background: '#f7faff' }}>
      {/* Announcement */}
      {site?.announcement && (
        <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border-b border-blue-100 py-2.5">
          {/* Desktop / tablet — static centered */}
          <p className="hidden md:block text-sm text-blue-700 text-center px-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 align-middle mr-2 animate-pulse" />
            {site.announcement}
          </p>

          {/* Mobile — horizontal marquee broadcast */}
          <div className="md:hidden flex items-center gap-2 overflow-hidden marquee-mask">
            {/* Megaphone icon (fixed, doesn't scroll) */}
            <span className="shrink-0 pl-3 flex items-center text-blue-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </span>
            <div className="marquee text-sm text-blue-700 whitespace-nowrap">
              {/* Two identical items so the loop is seamless when translated by -50% */}
              <span className="marquee-item">{site.announcement}</span>
              <span className="marquee-item" aria-hidden="true">{site.announcement}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0 flex-shrink">
            {site?.logo ? (
              <img
                src={site.logo}
                alt={siteName}
                className="h-7 sm:h-8 max-w-[110px] sm:max-w-[160px] w-auto object-contain shrink-0"
              />
            ) : (
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25 shrink-0">
                <span className="relative z-10">{siteName.charAt(0)}</span>
                <div className="absolute inset-0 rounded-xl bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm sm:text-[15px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                {siteName}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-medium hidden sm:block">
                AI API Gateway
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-50/60 border border-slate-200/60 rounded-xl px-1.5 py-1">
            {visibleNavItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  isActive(n.to)
                    ? 'text-blue-700 bg-white shadow-sm shadow-blue-500/10 font-medium'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* LanguageSwitch shown on >=sm; on mobile it lives inside the menu */}
            <div className="hidden sm:block">
              <LanguageSwitch className="text-slate-400 hover:text-blue-600 hover:bg-blue-50" />
            </div>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
                  <span className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white text-xs font-semibold">
                    {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-700">{user.display_name || user.username}</span>
                </div>
                {/* Mobile-only avatar pill (compact) */}
                <span className="sm:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white text-xs font-semibold">
                  {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
                </span>
                <button
                  onClick={async () => { await logout(); navigate('/'); }}
                  className="hidden sm:inline text-sm text-slate-500 hover:text-blue-600 transition-colors px-2"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-600 hover:text-blue-600 px-3 py-2 hidden sm:block transition-colors">
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white text-xs sm:text-sm font-medium whitespace-nowrap transition-all shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-px"
                  style={{ backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)' }}
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}

            <button
              className="md:hidden p-2 rounded-lg hover:bg-blue-50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/70 bg-white/95 backdrop-blur-xl">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-1">
              {visibleNavItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    isActive(n.to)
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {n.label}
                </Link>
              ))}

              {/* Auth actions on small screens */}
              {!user && (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-sm text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors sm:hidden"
                >
                  {t('nav.login')}
                </Link>
              )}
              {user && (
                <button
                  onClick={async () => { setMobileMenuOpen(false); await logout(); navigate('/'); }}
                  className="text-left px-3 py-2.5 text-sm text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors sm:hidden"
                >
                  {t('nav.logout')}
                </button>
              )}

              {/* Language switch row (mobile only) */}
              <div className="sm:hidden mt-1 pt-3 border-t border-slate-200/70 flex items-center justify-between px-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Language</span>
                <LanguageSwitch className="text-slate-500 hover:text-blue-600 hover:bg-blue-50" />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 bg-white/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-3 min-w-0">
              {site?.logo ? (
                <img src={site.logo} alt={siteName} className="h-7 max-w-[120px] w-auto object-contain opacity-80 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {siteName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{siteName}</p>
                <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} · {t('home.heroTagline') || 'AI API Platform'}</p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <Link to="/pricing" className="hover:text-blue-600 transition-colors">{t('nav.pricing')}</Link>
              <Link to="/packages" className="hover:text-blue-600 transition-colors">{t('nav.packages')}</Link>
              {site?.contact_email && (
                <a href={`mailto:${site.contact_email}`} className="hover:text-blue-600 transition-colors">
                  {t('nav.contact')}
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
