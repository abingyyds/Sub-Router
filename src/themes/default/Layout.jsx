import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import LanguageSwitch from '../../components/LanguageSwitch';
import UserMenu from '../../components/UserMenu';
import { FooterLegalLinks } from '../../components/LegalLinks';
import {
  getHeaderNavItems,
  getSiteNavItems,
  getUserMenuNavItems,
  getVisibleNavItems,
  isSiteNavActive,
} from '../../utils/navigation';

export default function DefaultLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { site } = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const siteName = site?.name || 'AI Platform';

  const siteNavItems = getSiteNavItems({ t, site });
  const headerNavItems = getVisibleNavItems(getHeaderNavItems(siteNavItems), user);
  const mobileNavItems = getVisibleNavItems(getHeaderNavItems(siteNavItems), user);
  const userMenuItems = getUserMenuNavItems(siteNavItems, user);
  const isNavActive = (to) => isSiteNavActive(location.pathname, to);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="theme-light theme-starter min-h-screen flex flex-col bg-[#f7f8fb] text-slate-950">
      {site?.announcement && (
        <div className="border-b border-slate-200 bg-slate-950 px-4 py-2.5 text-center">
          <p className="text-sm font-medium text-white/90">{site.announcement}</p>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 group">
            {site?.logo ? (
              <img src={site.logo} alt={siteName} className="h-8 w-auto max-w-[150px] object-contain" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white shadow-sm">
                {siteName.charAt(0)}
              </div>
            )}
            <span className="truncate text-base font-bold tracking-tight text-slate-950 group-hover:text-indigo-700 sm:text-lg">
              {siteName}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 lg:flex">
            {headerNavItems.map((n) => (
              <NavLink key={n.to} to={n.to} active={isNavActive(n.to)}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitch className="text-slate-500 hover:bg-slate-100 hover:text-slate-950" />

            {user ? (
              <UserMenu
                user={user}
                items={userMenuItems}
                onLogout={handleLogout}
                logoutLabel={t('nav.logout')}
                buttonClassName="border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-950"
                menuClassName="border-slate-200 bg-white/95 text-slate-700 shadow-slate-900/10"
                itemClassName="hover:bg-slate-100 hover:text-slate-950"
              />
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-950">
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  {t('nav.signUp')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              {mobileNavItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isNavActive(n.to)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  {n.label}
                </Link>
              ))}

              {!user && (
                <div className="mt-2 border-t border-slate-200 pt-3 sm:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700"
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-lg bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white"
                    >
                      {t('nav.signUp')}
                    </Link>
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} {siteName}</p>
          <div className="flex flex-wrap items-center gap-4">
            <FooterLegalLinks className="flex items-center gap-2" linkClassName="font-medium text-slate-500 hover:text-slate-950" />
            {site?.contact_email && (
              <a href={`mailto:${site.contact_email}`} className="font-medium text-slate-500 hover:text-slate-950">
                {t('nav.contact')}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, children, active }) {
  return (
    <Link
      to={to}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-600 hover:text-slate-950'
      }`}
    >
      {children}
    </Link>
  );
}
