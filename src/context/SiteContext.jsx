import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSiteInfo } from '../api';

const SiteContext = createContext(null);

// Map theme template name → CSS class(es) to apply on <body>
const themeClassMap = {
  starter: 'theme-light theme-starter',
  default: 'theme-light theme-starter',
  dark: 'theme-dark',
  minimal: 'theme-minimal',
  clean: 'theme-light',
  corporate: 'theme-light',
  claude: 'theme-light theme-claude',
  aurora: 'theme-light theme-aurora',
  terminal: 'theme-terminal',
  market: 'theme-light theme-market',
  maoqiu: 'theme-light theme-maoqiu',
};

function applyThemeClass(themeName) {
  const cls = themeClassMap[themeName] || '';
  document.body.className = cls + (cls ? ' ' : '') + 'antialiased';
  try { localStorage.setItem('dist-theme-class', cls); } catch(e) {}
}

function getDevPreviewTheme() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('preview_theme') || '';
}

function upsertMeta(name, content) {
  if (!content) return;
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function upsertLink(rel, href, attrs = {}) {
  if (!href) return;
  const sizesSelector = attrs.sizes ? `[sizes="${attrs.sizes}"]` : ':not([sizes])';
  let link = document.querySelector(`link[rel="${rel}"]${sizesSelector}`);
  if (!link) {
    link = document.createElement('link');
    document.head.appendChild(link);
  }
  link.rel = rel;
  link.href = href;
  Object.entries(attrs).forEach(([key, value]) => {
    if (value) link.setAttribute(key, value);
  });
}

function applySiteDocumentMeta(site) {
  const siteName = site?.name;
  const iconUrl = site?.favicon || site?.logo;

  if (siteName) {
    document.title = siteName;
    upsertMeta('application-name', siteName);
    upsertMeta('apple-mobile-web-app-title', siteName);
  }

  if (iconUrl) {
    upsertLink('icon', iconUrl);
    upsertLink('shortcut icon', iconUrl);
    upsertLink('apple-touch-icon', iconUrl);
    upsertLink('apple-touch-icon', iconUrl, { sizes: '180x180' });
  }

  upsertLink('manifest', '/site.webmanifest');
}

export function SiteProvider({ children }) {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const previewTheme = getDevPreviewTheme();
    if (previewTheme) {
      const previewSite = {
        name: 'SubRouter Preview',
        theme_template: previewTheme,
        enable_topup: true,
        top_up_link: 'https://example.com/redeem-codes',
        allow_sub_dist: true,
        currency: {
          code: 'CNY',
          symbol: '¥',
          exchange_rate: 7,
          usd_exchange_rate: 7,
        },
      };
      setSite(previewSite);
      applyThemeClass(previewTheme);
      applySiteDocumentMeta({ ...previewSite, name: `${previewSite.name} · ${previewTheme}` });
      setLoading(false);
      return;
    }

    getSiteInfo()
      .then((res) => {
        if (res.data.success) {
          setSite(res.data.data);
          // Apply theme class to body immediately
          applyThemeClass(res.data.data?.theme_template);
          applySiteDocumentMeta(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SiteContext.Provider value={{ site, loading }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}

/**
 * useCurrency - 获取分站货币配置
 * 返回 { symbol, rate, code, fmt(usdValue) }
 * fmt() 将 USD 值转换为显示货币并格式化
 */
export function useCurrency() {
  const { site } = useSite();
  const currency = site?.currency;
  const symbol = currency?.symbol || '¥';
  const rate = currency?.exchange_rate || 7;
  const code = currency?.code || 'CNY';
  const usdRate = currency?.usd_exchange_rate || 7;

  const fmt = (usdValue, decimals = 4) => {
    if (usdValue == null || isNaN(usdValue)) return '-';
    const converted = Number(usdValue) * rate;
    return symbol + converted.toFixed(decimals);
  };

  const fmtCNY = (cnyValue, decimals = 2) => {
    if (cnyValue == null || isNaN(cnyValue)) return '-';
    const v = Number(cnyValue);
    const converted = code === 'CNY' ? v : v / usdRate;
    return symbol + converted.toFixed(decimals);
  };

  return { symbol, rate, code, fmt, fmtCNY, usdRate };
}
