import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import LanguageSwitch from '../../components/LanguageSwitch';

export default function DarkLayout() {
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
    <div className="min-h-screen flex flex-col bg-[#030712] text-white">
      {/* Announcement Banner */}
      {site?.announcement && (
        <div className="bg-emerald-500/5 border-b border-emerald-500/10 text-center py-2 px-4">
          <p className="text-sm text-emerald-300/80 font-mono">{site.announcement}</p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#030712]/80 border-b border-emerald-500/[0.08]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {site?.logo ? (
              <img src={site.logo} alt={siteName} className="h-7 w-auto" />
            ) : (
              <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
                {siteName.charAt(0)}
              </div>
            )}
            <span className="text-base font-semibold text-emerald-400 font-mono group-hover:text-emerald-300 transition-colors tracking-wide">
              {siteName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 text-sm font-mono rounded transition-all ${
                  isNavActive(n.to)
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-neutral-500 hover:text-emerald-400'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitch className="text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/5 font-mono" />

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-500 font-mono hidden sm:block">{user.display_name || user.username}</span>
                <button onClick={async () => { await logout(); navigate('/'); }} className="text-sm text-neutral-500 hover:text-emerald-400 font-mono transition-colors">
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm text-neutral-500 hover:text-emerald-400 font-mono transition-colors hidden sm:block px-3 py-1.5">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="px-4 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-mono hover:bg-emerald-500/15 transition-all">
                  {t('nav.signUp')}
                </Link>
              </>
            )}
            <button className="md:hidden p-1.5 rounded hover:bg-white/5" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-emerald-500/[0.08] bg-[#030712]/95 backdrop-blur-xl">
            <nav className="max-w-7xl mx-auto px-6 py-3 flex flex-col gap-1">
              {visibleNavItems.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 text-sm font-mono rounded transition-colors ${isNavActive(n.to) ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-500 hover:text-emerald-400'}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-emerald-500/[0.08] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-600 font-mono">&copy; {new Date().getFullYear()} {siteName}</p>
          {site?.contact_email && (
            <a href={`mailto:${site.contact_email}`} className="text-xs text-neutral-600 hover:text-emerald-400 font-mono transition-colors">
              {t('nav.contact')}
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
