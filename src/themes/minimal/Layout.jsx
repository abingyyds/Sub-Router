import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import LanguageSwitch from '../../components/LanguageSwitch';

export default function MinimalLayout() {
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
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      {/* Announcement */}
      {site?.announcement && (
        <div className="border-b border-neutral-800/60 text-center py-2 px-4">
          <p className="text-sm text-neutral-400">{site.announcement}</p>
        </div>
      )}

      {/* Header — minimal */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-neutral-950/80 border-b border-neutral-800/40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            {site?.logo ? (
              <img src={site.logo} alt={siteName} className="h-7 w-auto" />
            ) : (
              <span className="text-base font-semibold text-white">{siteName}</span>
            )}
            {site?.logo && (
              <span className="text-base font-semibold text-white">{siteName}</span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {visibleNavItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`text-sm transition-colors ${
                  isNavActive(n.to)
                    ? 'text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitch className="text-neutral-500 hover:text-white hover:bg-white/5" />

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-500 hidden sm:block">{user.display_name || user.username}</span>
                <button onClick={async () => { await logout(); navigate('/'); }} className="text-sm text-neutral-500 hover:text-white transition-colors">
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm text-neutral-500 hover:text-white transition-colors hidden sm:block">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="px-4 py-1.5 rounded-lg bg-white text-neutral-900 text-sm font-medium hover:bg-neutral-200 transition-colors">
                  {t('nav.signUp')}
                </Link>
              </>
            )}
            <button className="md:hidden p-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-800/40 bg-neutral-950/95">
            <nav className="max-w-5xl mx-auto px-6 py-3 flex flex-col gap-1">
              {visibleNavItems.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 text-sm rounded transition-colors ${isNavActive(n.to) ? 'text-white' : 'text-neutral-500 hover:text-white'}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-neutral-800/40 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-600">&copy; {new Date().getFullYear()} {siteName}</p>
          {site?.contact_email && (
            <a href={`mailto:${site.contact_email}`} className="text-xs text-neutral-600 hover:text-white transition-colors">
              {t('nav.contact')}
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
