import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import LanguageSwitch from '../../components/LanguageSwitch';

export default function ClaudeLayout() {
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
    <div className="theme-light theme-claude min-h-screen flex flex-col bg-[#FAF6F1] text-[#3D3024]">
      {/* Announcement */}
      {site?.announcement && (
        <div className="bg-[#D97757] text-center py-2.5 px-4">
          <p className="text-sm text-white font-medium">{site.announcement}</p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FAF6F1]/85 backdrop-blur-xl border-b border-[#E8DDD0]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {site?.logo ? (
              <img src={site.logo} alt={siteName} className="h-8 w-auto" />
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#D97757] to-[#C4613F] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {siteName.charAt(0)}
              </div>
            )}
            <span className="text-lg font-semibold text-[#3D3024] group-hover:text-[#D97757] transition-colors">
              {siteName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3.5 py-2 text-sm rounded-lg transition-all ${
                  isNavActive(n.to)
                    ? 'text-[#D97757] bg-[#D97757]/8 font-medium'
                    : 'text-[#6B5D4F] hover:text-[#3D3024] hover:bg-[#E8DDD0]/50'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitch className="text-[#8B7D6E] hover:text-[#3D3024] hover:bg-[#E8DDD0]/50" />

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6B5D4F] hidden sm:block">{user.display_name || user.username}</span>
                <button
                  onClick={async () => { await logout(); navigate('/'); }}
                  className="text-sm text-[#8B7D6E] hover:text-[#3D3024] transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm text-[#6B5D4F] hover:text-[#3D3024] px-3 py-2 hidden sm:block transition-colors">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="px-5 py-2 rounded-full bg-[#D97757] text-white text-sm font-medium hover:bg-[#C4613F] transition-colors shadow-sm">
                  {t('nav.signUp')}
                </Link>
              </>
            )}

            <button
              className="md:hidden p-2 rounded-lg hover:bg-[#E8DDD0]/50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5 text-[#6B5D4F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="md:hidden border-t border-[#E8DDD0] bg-[#FAF6F1]">
            <nav className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-1">
              {visibleNavItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    isNavActive(n.to)
                      ? 'text-[#D97757] bg-[#D97757]/8 font-medium'
                      : 'text-[#6B5D4F] hover:text-[#3D3024] hover:bg-[#E8DDD0]/50'
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

      <footer className="border-t border-[#E8DDD0] mt-auto bg-[#F5EEE6]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#8B7D6E]">&copy; {new Date().getFullYear()} {siteName}.</p>
          <div className="flex items-center gap-4">
            {site?.contact_email && (
              <a href={`mailto:${site.contact_email}`} className="text-sm text-[#8B7D6E] hover:text-[#D97757] transition-colors">
                {t('nav.contact')}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
