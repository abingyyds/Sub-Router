import React, { createContext, useContext, useMemo } from 'react';
import { useSite } from './SiteContext';

const ThemeContext = createContext(null);

// Theme registry — lazy-loaded per-theme Home & Layout components
const themeRegistry = {
  starter: {
    Home: React.lazy(() => import('../themes/starter/Home')),
    Layout: React.lazy(() => import('../themes/starter/Layout')),
  },
  default: {
    Home: React.lazy(() => import('../themes/default/Home')),
    Layout: React.lazy(() => import('../themes/default/Layout')),
  },
  dark: {
    Home: React.lazy(() => import('../themes/dark/Home')),
    Layout: React.lazy(() => import('../themes/dark/Layout')),
  },
  minimal: {
    Home: React.lazy(() => import('../themes/minimal/Home')),
    Layout: React.lazy(() => import('../themes/minimal/Layout')),
  },
  clean: {
    Home: React.lazy(() => import('../themes/clean/Home')),
    Layout: React.lazy(() => import('../themes/clean/Layout')),
  },
  corporate: {
    Home: React.lazy(() => import('../themes/corporate/Home')),
    Layout: React.lazy(() => import('../themes/corporate/Layout')),
  },
  claude: {
    Home: React.lazy(() => import('../themes/claude/Home')),
    Layout: React.lazy(() => import('../themes/claude/Layout')),
  },
  aurora: {
    Home: React.lazy(() => import('../themes/aurora/Home')),
    Layout: React.lazy(() => import('../themes/aurora/Layout')),
  },
  terminal: {
    Home: React.lazy(() => import('../themes/terminal/Home')),
    Layout: React.lazy(() => import('../themes/terminal/Layout')),
  },
  market: {
    Home: React.lazy(() => import('../themes/market/Home')),
    Layout: React.lazy(() => import('../themes/market/Layout')),
  },
  maoqiu: {
    Home: React.lazy(() => import('../themes/maoqiu/Home')),
    Layout: React.lazy(() => import('../themes/maoqiu/Layout')),
  },
};

// Full-screen loading spinner shown while site info is being fetched
// Prevents theme flash (rendering default theme before API returns the real one)
function ThemeLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <div className="w-8 h-8 rounded-full animate-spin"
        style={{ border: '2px solid var(--page-spinner-track)', borderTopColor: 'var(--page-spinner)' }} />
    </div>
  );
}

export function ThemeProvider({ children }) {
  const { site, loading } = useSite();

  // Block rendering until site info is loaded so we know the correct theme
  if (loading) {
    return <ThemeLoading />;
  }

  const themeName = site?.theme_template || 'starter';

  return (
    <ThemeInner themeName={themeName}>
      {children}
    </ThemeInner>
  );
}

// Inner component to keep useMemo stable after loading completes
function ThemeInner({ themeName, children }) {
  const theme = useMemo(() => {
    const t = themeRegistry[themeName] || themeRegistry.starter;
    return { name: themeName, ...t };
  }, [themeName]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
