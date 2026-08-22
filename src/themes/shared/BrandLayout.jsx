import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import LanguageSwitch from '../../components/LanguageSwitch';
import UserMenu from '../../components/UserMenu';
import { FooterLegalLinks } from '../../components/LegalLinks';
import maoqiuAiImage from '../../assets/maoqiu-ai.png';
import {
  getHeaderNavItems,
  getSiteNavItems,
  getUserMenuNavItems,
  getVisibleNavItems,
  isSiteNavActive,
} from '../../utils/navigation';

const configs = {
  default: {
    root: 'theme-light theme-starter min-h-screen flex flex-col bg-[#f7f8fb] text-slate-950',
    main: 'theme-page-shell starter-page-shell flex-1',
    announcement: 'border-b border-slate-200 bg-slate-950 px-4 py-2.5 text-center text-sm font-medium text-white',
    header: 'sticky top-0 z-50 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl',
    logo: 'bg-slate-950 text-white shadow-lg shadow-slate-900/10',
    navWrap: 'hidden items-center gap-1 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm xl:flex',
    navActive: 'bg-slate-950 text-white shadow-sm',
    navIdle: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
    language: 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
    menu: 'border-slate-200 bg-white/95 text-slate-700 shadow-slate-900/10',
    menuItem: 'hover:bg-slate-100 hover:text-slate-950',
    primary: 'bg-slate-950 text-white hover:bg-indigo-700',
    mobileActive: 'bg-indigo-50 text-indigo-700',
    mobileIdle: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
    footer: 'mt-auto border-t border-slate-200 bg-white',
  },
  clean: {
    root: 'theme-light min-h-screen flex flex-col bg-white text-gray-900',
    main: 'theme-page-shell clean-page-shell flex-1',
    announcement: 'border-b border-blue-100 bg-blue-50 px-4 py-2.5 text-center text-sm font-medium text-blue-700',
    header: 'sticky top-0 z-50 border-b border-gray-100 bg-white/88 backdrop-blur-xl',
    logo: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/15',
    navWrap: 'hidden items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/80 p-1 shadow-sm xl:flex',
    navActive: 'bg-blue-600 text-white shadow-sm',
    navIdle: 'text-gray-600 hover:bg-white hover:text-gray-950',
    language: 'text-gray-400 hover:bg-gray-50 hover:text-gray-700',
    menu: 'border-gray-200 bg-white/95 text-gray-700 shadow-slate-900/10',
    menuItem: 'hover:bg-gray-50 hover:text-gray-950',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    mobileActive: 'bg-blue-50 text-blue-700',
    mobileIdle: 'text-gray-600 hover:bg-gray-50 hover:text-gray-950',
    footer: 'mt-auto border-t border-gray-100 bg-gray-50/60',
  },
  corporate: {
    root: 'theme-light min-h-screen flex flex-col bg-white text-slate-900',
    main: 'theme-page-shell corporate-page-shell flex-1',
    announcement: 'border-b border-slate-800 bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-slate-200',
    header: 'sticky top-0 z-50 border-b border-slate-200 bg-white/92 backdrop-blur-xl',
    logo: 'bg-slate-900 text-white shadow-lg shadow-slate-900/10',
    navWrap: 'hidden items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1 xl:flex',
    navActive: 'bg-slate-900 text-white shadow-sm',
    navIdle: 'text-slate-600 hover:bg-white hover:text-slate-950',
    language: 'text-slate-400 hover:bg-slate-50 hover:text-slate-700',
    menu: 'border-slate-200 bg-white/95 text-slate-700 shadow-slate-900/10',
    menuItem: 'hover:bg-slate-50 hover:text-slate-950',
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    mobileActive: 'bg-slate-100 text-slate-950',
    mobileIdle: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
    footer: 'mt-auto border-t border-slate-200 bg-white',
  },
  claude: {
    root: 'theme-light theme-claude min-h-screen flex flex-col bg-[#FAF6F1] text-[#3D3024]',
    main: 'theme-page-shell claude-page-shell flex-1',
    announcement: 'border-b border-[#C4613F] bg-[#D97757] px-4 py-2.5 text-center text-sm font-medium text-white',
    header: 'sticky top-0 z-50 border-b border-[#E8DDD0] bg-[#FAF6F1]/88 backdrop-blur-xl',
    logo: 'bg-gradient-to-br from-[#D97757] to-[#C4613F] text-white shadow-lg shadow-orange-900/10',
    navWrap: 'hidden items-center gap-1 rounded-xl border border-[#E8DDD0] bg-white/55 p-1 xl:flex',
    navActive: 'bg-[#D97757]/10 text-[#D97757] shadow-sm',
    navIdle: 'text-[#6B5D4F] hover:bg-[#E8DDD0]/50 hover:text-[#3D3024]',
    language: 'text-[#8B7D6E] hover:bg-[#E8DDD0]/50 hover:text-[#3D3024]',
    menu: 'border-[#E8DDD0] bg-[#FAF6F1]/95 text-[#6B5D4F] shadow-[#6B5D4F]/10',
    menuItem: 'hover:bg-[#E8DDD0]/50 hover:text-[#3D3024]',
    primary: 'bg-[#D97757] text-white hover:bg-[#C4613F]',
    mobileActive: 'bg-[#D97757]/10 text-[#D97757]',
    mobileIdle: 'text-[#6B5D4F] hover:bg-[#E8DDD0]/50 hover:text-[#3D3024]',
    footer: 'mt-auto border-t border-[#E8DDD0] bg-[#F5EEE6]',
  },
  dark: {
    root: 'theme-dark min-h-screen flex flex-col bg-[#030712] text-white',
    main: 'theme-page-shell dark-page-shell flex-1',
    announcement: 'border-b border-emerald-500/10 bg-emerald-500/[0.06] px-4 py-2.5 text-center font-mono text-sm text-emerald-300/80',
    header: 'sticky top-0 z-50 border-b border-emerald-500/[0.1] bg-[#030712]/88 backdrop-blur-xl',
    logo: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-950/20',
    navWrap: 'hidden items-center gap-1 rounded-xl border border-emerald-500/[0.12] bg-emerald-500/[0.035] p-1 xl:flex',
    navActive: 'bg-emerald-500/15 text-emerald-300 shadow-sm',
    navIdle: 'text-neutral-500 hover:bg-emerald-500/[0.08] hover:text-emerald-300',
    language: 'font-mono text-neutral-500 hover:bg-emerald-500/[0.08] hover:text-emerald-300',
    menu: 'border-emerald-500/15 bg-[#030712]/95 text-neutral-300 shadow-black/40',
    menuItem: 'hover:bg-emerald-500/[0.08] hover:text-emerald-300',
    primary: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    mobileActive: 'bg-emerald-500/10 text-emerald-300',
    mobileIdle: 'text-neutral-500 hover:bg-emerald-500/[0.08] hover:text-emerald-300',
    footer: 'mt-auto border-t border-emerald-500/[0.1] bg-[#030712]',
  },
  minimal: {
    root: 'theme-minimal min-h-screen flex flex-col bg-neutral-950 text-white',
    main: 'theme-page-shell minimal-page-shell flex-1',
    announcement: 'border-b border-neutral-800/70 bg-neutral-950 px-4 py-2.5 text-center text-sm text-neutral-400',
    header: 'sticky top-0 z-50 border-b border-neutral-800/60 bg-neutral-950/88 backdrop-blur-xl',
    logo: 'bg-white text-neutral-950 shadow-lg shadow-white/10',
    navWrap: 'hidden items-center gap-1 rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-1 xl:flex',
    navActive: 'bg-white text-neutral-950 shadow-sm',
    navIdle: 'text-neutral-500 hover:bg-neutral-800 hover:text-white',
    language: 'text-neutral-500 hover:bg-neutral-800 hover:text-white',
    menu: 'border-neutral-800 bg-neutral-950/95 text-neutral-300 shadow-black/40',
    menuItem: 'hover:bg-neutral-800 hover:text-white',
    primary: 'bg-white text-neutral-950 hover:bg-neutral-200',
    mobileActive: 'bg-neutral-800 text-white',
    mobileIdle: 'text-neutral-500 hover:bg-neutral-800 hover:text-white',
    footer: 'mt-auto border-t border-neutral-800/60 bg-neutral-950',
  },
  aurora: {
    root: 'theme-light theme-aurora min-h-screen flex flex-col bg-[#f6f8fb] text-slate-950',
    main: 'theme-page-shell aurora-page-shell flex-1',
    announcement: 'border-b border-slate-800 bg-slate-950 px-4 py-2.5 text-center text-sm font-medium text-slate-100',
    header: 'sticky top-0 z-50 border-b border-slate-200 bg-[#f6f8fb]/88 backdrop-blur-xl',
    logo: 'bg-slate-950 text-white shadow-lg shadow-slate-900/10',
    navWrap: 'hidden items-center gap-1 rounded-lg border border-slate-200 bg-white/80 p-1 shadow-sm xl:flex',
    navActive: 'bg-slate-950 text-white shadow-sm',
    navIdle: 'text-slate-600 hover:bg-white hover:text-slate-950',
    language: 'text-slate-500 hover:bg-white/80 hover:text-slate-950',
    menu: 'border-slate-200 bg-white/95 text-slate-700 shadow-slate-900/10',
    menuItem: 'hover:bg-slate-100 hover:text-slate-950',
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
    navWrap: 'hidden items-center gap-1 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-1 xl:flex',
    navActive: 'bg-emerald-400 text-black shadow-sm',
    navIdle: 'text-emerald-200/70 hover:bg-emerald-400/10 hover:text-emerald-100',
    language: 'text-emerald-200/70 hover:bg-emerald-400/10 hover:text-emerald-100',
    menu: 'border-emerald-400/15 bg-[#050807]/95 text-emerald-200',
    menuItem: 'hover:bg-emerald-400/10 hover:text-emerald-100',
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
    navWrap: 'hidden items-center gap-1 rounded-lg border border-stone-200 bg-white/80 p-1 shadow-sm xl:flex',
    navActive: 'bg-stone-950 text-white shadow-sm',
    navIdle: 'text-stone-600 hover:bg-white hover:text-stone-950',
    language: 'text-stone-500 hover:bg-white hover:text-stone-950',
    menu: 'border-stone-200 bg-[#fbfaf7]/95 text-stone-700 shadow-stone-900/10',
    menuItem: 'hover:bg-white hover:text-stone-950',
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
    navWrap: 'hidden items-center gap-1 rounded-lg border border-slate-200 bg-white/82 p-1 shadow-sm xl:flex',
    navActive: 'bg-gradient-to-r from-[#0788ff] to-[#b93dff] text-white shadow-sm',
    navIdle: 'text-slate-600 hover:bg-[#f4f7ff] hover:text-[#071337]',
    language: 'text-slate-500 hover:bg-[#f4f7ff] hover:text-[#071337]',
    menu: 'border-slate-200 bg-white/95 text-slate-700 shadow-slate-900/10',
    menuItem: 'hover:bg-[#f4f7ff] hover:text-[#071337]',
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
    <div className={cfg.root} data-theme={variant}>
      {site?.announcement && <div className={cfg.announcement}>{site.announcement}</div>}

      <header className={cfg.header}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 group">
            {site?.logo ? (
              <img
                src={site.logo}
                alt={siteName}
                className="h-8 w-auto max-w-[110px] object-contain sm:max-w-[150px]"
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
            {!site?.logo && (
              <span className="truncate text-base font-black tracking-tight sm:text-lg">{siteName}</span>
            )}
          </Link>

          <nav
            aria-label={t('nav.main', { defaultValue: 'Main navigation' })}
            className={cfg.navWrap}
          >
            {headerNavItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                aria-current={isNavActive(n.to) ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  isNavActive(n.to) ? cfg.navActive : cfg.navIdle
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitch className={cfg.language} />
            {user ? (
              <UserMenu
                user={user}
                items={userMenuItems}
                onLogout={handleLogout}
                logoutLabel={t('nav.logout')}
                buttonClassName="border-current/10 bg-current/[0.04] hover:bg-current/10"
                menuClassName={cfg.menu}
                itemClassName={cfg.menuItem}
              />
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-current/10 xl:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t('common.toggleMenu')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-current/10 bg-inherit xl:hidden">
            <nav
              aria-label={t('nav.main', { defaultValue: 'Main navigation' })}
              className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6"
            >
              {mobileNavItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isNavActive(n.to) ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isNavActive(n.to) ? cfg.mobileActive : cfg.mobileIdle
                  }`}
                >
                  {n.label}
                </Link>
              ))}
              {!user && (
                <div className="mt-2 border-t border-current/10 pt-3 sm:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-current/10 px-3 py-2 text-center text-sm font-semibold">
                      {t('nav.login')}
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${cfg.primary}`}>
                      {t('nav.signUp')}
                    </Link>
                  </div>
                </div>
              )}
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
          <div className="flex flex-wrap items-center gap-4">
            <FooterLegalLinks className="flex items-center gap-2" linkClassName="font-semibold hover:opacity-100" />
            {site?.contact_email && (
              <a href={`mailto:${site.contact_email}`} className="font-semibold hover:opacity-100">
                {t('nav.contact')}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
