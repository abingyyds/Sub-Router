import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import LanguageSwitch from '../../components/LanguageSwitch';

export default function CorporateLayout() {
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
  const isNavActive = (to) => location.pathname === to || (to === '/logs' && location.pathname === '/tasks');

  return (
    <div className="theme-light min-h-screen flex flex-col bg-white text-gray-900">
      {/* Announcement */}
      {site?.announcement && (
        <div className="bg-slate-900 text-center py-2.5 px-4">
          <p className="text-sm text-slate-200">{site.announcement}</p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {site?.logo ? (
              <img src={site.logo} alt={siteName} className="h-8 w-auto" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                {siteName.charAt(0)}
              </div>
            )}
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              {siteName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {visibleNavItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  isNavActive(n.to)
                    ? 'text-slate-900 border-b-2 border-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitch className="text-slate-400 hover:text-slate-700 hover:bg-slate-50" />

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 hidden sm:block font-medium">
                  {user.display_name || user.username}
                </span>
                <button
                  onClick={async () => { await logout(); navigate('/'); }}
                  className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2 hidden sm:block transition-colors font-medium">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
                  {t('nav.signUp')}
                </Link>
              </>
            )}

            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-50 transition-colors"
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

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="max-w-7xl mx-auto px-6 py-3 flex flex-col">
              {visibleNavItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 text-sm font-medium border-b border-gray-100 last:border-0 transition-colors ${
                    isNavActive(n.to)
                      ? 'text-slate-900 bg-slate-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-gray-200 mt-auto bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">{siteName}</span>
              <p className="text-xs text-slate-400 mt-1">&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-6">
              {site?.contact_email && (
                <a href={`mailto:${site.contact_email}`} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
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
