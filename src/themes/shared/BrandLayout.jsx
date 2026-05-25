import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, LogOut, Menu, UserCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import LanguageSwitch from '../../components/LanguageSwitch';
import maoqiuAiImage from '../../assets/maoqiu-ai.png';

const configs = {
  aurora: {
    root: 'theme-light theme-aurora min-h-screen flex flex-col bg-[#f6f8fb] text-slate-950',
    main: 'theme-page-shell aurora-page-shell flex-1',
    announcement: 'border-b border-slate-800 bg-slate-950 px-4 py-2.5 text-center text-sm font-medium text-slate-100',
    header: 'sticky top-0 z-50 border-b border-slate-200 bg-[#f6f8fb]/88 backdrop-blur-xl',
    logo: 'bg-slate-950 text-white shadow-lg shadow-slate-900/10',
    navWrap: 'hidden items-center gap-1 rounded-lg border border-slate-200 bg-white/80 p-1 shadow-sm md:flex',
    navActive: 'bg-slate-950 text-white shadow-sm',
    navIdle: 'text-slate-600 hover:bg-white hover:text-slate-950',
    language: 'text-slate-500 hover:bg-white/80 hover:text-slate-950',
    primary: 'bg-slate-950 text-white hover:bg-indigo-700',
    mobileActive: 'bg-indigo-50 text-indigo-700',
    mobileIdle: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
    footer: 'mt-auto border-t border-slate-200 bg-white',
  },
  terminal: {
    root: 'theme-terminal min-h-screen flex flex-col bg-[#050807] text-emerald-50',
    main: 'theme-page-shell terminal-page-shell flex-1',
    announcement: 'border-b border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-center font-mono text-sm text-emerald-200',
    header: 'sticky top-0 z-50 border-b border-emerald-400/15 bg-[#050807]/88 backdrop-blur-xl',
    logo: 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/20',
    navWrap: 'hidden items-center gap-1 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-1 md:flex',
    navActive: 'bg-emerald-400 text-black shadow-sm',
    navIdle: 'text-emerald-200/70 hover:bg-emerald-400/10 hover:text-emerald-100',
    language: 'text-emerald-200/70 hover:bg-emerald-400/10 hover:text-emerald-100',
    primary: 'bg-emerald-400 text-black hover:bg-emerald-300',
    mobileActive: 'bg-emerald-400/10 text-emerald-200',
    mobileIdle: 'text-emerald-200/70 hover:bg-emerald-400/10 hover:text-emerald-100',
    footer: 'mt-auto border-t border-emerald-400/15 bg-[#050807]',
  },
  market: {
    root: 'theme-light theme-market min-h-screen flex flex-col bg-[#fbfaf7] text-stone-950',
    main: 'theme-page-shell market-page-shell flex-1',
    announcement: 'border-b border-stone-800 bg-stone-950 px-4 py-2.5 text-center text-sm font-semibold text-stone-100',
    header: 'sticky top-0 z-50 border-b border-stone-200 bg-[#fbfaf7]/90 backdrop-blur-xl',
    logo: 'bg-stone-950 text-white shadow-lg shadow-stone-900/10',
    navWrap: 'hidden items-center gap-1 rounded-lg border border-stone-200 bg-white/80 p-1 shadow-sm md:flex',
    navActive: 'bg-stone-950 text-white shadow-sm',
    navIdle: 'text-stone-600 hover:bg-white hover:text-stone-950',
    language: 'text-stone-500 hover:bg-white hover:text-stone-950',
    primary: 'bg-stone-950 text-white hover:bg-orange-600',
    mobileActive: 'bg-orange-50 text-orange-700',
    mobileIdle: 'text-stone-600 hover:bg-white hover:text-stone-950',
    footer: 'mt-auto border-t border-stone-200 bg-[#fbfaf7]',
  },
  maoqiu: {
    root: 'theme-light theme-maoqiu min-h-screen flex flex-col bg-white text-slate-950',
    main: 'theme-page-shell maoqiu-page-shell flex-1',
    announcement: 'border-b border-[#1b2a5b]/10 bg-[#f7f9ff] px-4 py-2.5 text-center text-sm font-semibold text-[#1b2a5b]',
    header: 'sticky top-0 z-50 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl',
    logo: 'bg-gradient-to-br from-[#0788ff] via-[#2248ff] to-[#ec4bff] text-white shadow-lg shadow-blue-500/20',
    navWrap: 'hidden items-center gap-1 rounded-lg border border-slate-200 bg-white/82 p-1 shadow-sm md:flex',
    navActive: 'bg-gradient-to-r from-[#0788ff] to-[#b93dff] text-white shadow-sm',
    navIdle: 'text-slate-600 hover:bg-[#f4f7ff] hover:text-[#071337]',
    language: 'text-slate-500 hover:bg-[#f4f7ff] hover:text-[#071337]',
    primary: 'bg-gradient-to-r from-[#0788ff] to-[#b93dff] text-white hover:brightness-105',
    mobileActive: 'bg-[#eef5ff] text-[#2352ff]',
    mobileIdle: 'text-slate-600 hover:bg-[#f4f7ff] hover:text-[#071337]',
    footer: 'mt-auto border-t border-slate-200 bg-white',
    logoImage: maoqiuAiImage,
  },
};

export default function BrandLayout({ variant }) {
  const cfg = configs[variant] || configs.aurora;
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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={cfg.root}>
      {site?.announcement && <div className={cfg.announcement}>{site.announcement}</div>}

      <header className={cfg.header}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 group">
            {site?.logo ? (
              <img
                src={site.logo}
                alt={siteName}
                className="h-8 w-auto max-w-[150px] object-contain"
                onError={(event) => {
                  if (!cfg.logoImage || event.currentTarget.src === cfg.logoImage) return;
                  event.currentTarget.src = cfg.logoImage;
                }}
              />
            ) : cfg.logoImage ? (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ${cfg.logo}`}>
                <img src={cfg.logoImage} alt={siteName} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${cfg.logo}`}>
                {siteName.charAt(0)}
              </div>
            )}
            <span className="truncate text-base font-black tracking-tight sm:text-lg">{siteName}</span>
          </Link>

          <nav className={cfg.navWrap}>
            {visibleNavItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  isNavActive(n.to) ? cfg.navActive : cfg.navIdle
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitch className={cfg.language} />
            {user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex max-w-[180px] items-center gap-2 rounded-full border border-current/10 bg-current/[0.04] px-3 py-1.5 text-sm">
                  <UserCircle className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="truncate opacity-80">{user.display_name || user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-current/10"
                  aria-label={t('nav.logout')}
                  title={t('nav.logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className="rounded-full px-3 py-2 text-sm font-semibold opacity-75 hover:opacity-100">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold shadow-sm transition-colors ${cfg.primary}`}>
                  {t('nav.signUp')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-current/10 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-current/10 bg-inherit md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              {visibleNavItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isNavActive(n.to) ? cfg.mobileActive : cfg.mobileIdle
                  }`}
                >
                  {n.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-current/10 pt-3 sm:hidden">
                {user ? (
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold">
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-current/10 px-3 py-2 text-center text-sm font-semibold">
                      {t('nav.login')}
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${cfg.primary}`}>
                      {t('nav.signUp')}
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className={cfg.main || 'flex-1'}>
        <Outlet />
      </main>

      <footer className={cfg.footer}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm opacity-70 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} {siteName}</p>
          {site?.contact_email && (
            <a href={`mailto:${site.contact_email}`} className="font-semibold hover:opacity-100">
              {t('nav.contact')}
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
