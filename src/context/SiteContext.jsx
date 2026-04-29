import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSiteInfo } from '../api';

const SiteContext = createContext(null);

// Map theme template name → CSS class(es) to apply on <body>
const themeClassMap = {
  starter: '',
  default: 'theme-default',
  dark: 'theme-dark',
  minimal: 'theme-minimal',
  clean: 'theme-light',
  corporate: 'theme-light',
  claude: 'theme-light theme-claude',
  ai: 'theme-light theme-ai',
};

function applyThemeClass(themeName) {
  // Fallback to AI theme classes when site has no explicit theme.
  const cls = themeName && themeName in themeClassMap
    ? themeClassMap[themeName]
    : themeClassMap.ai;
  document.body.className = cls + (cls ? ' ' : '') + 'antialiased';
  try { localStorage.setItem('dist-theme-class', cls); } catch(e) {}
}

// Apply ai theme immediately on module load to prevent a flash of the
// default dark theme before getSiteInfo() resolves.
if (typeof document !== 'undefined') {
  applyThemeClass('ai');
}

export function SiteProvider({ children }) {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteInfo()
      .then((res) => {
        if (res.data.success) {
          setSite(res.data.data);
          // Force ai theme regardless of backend value.
          applyThemeClass('ai');
          // Update page title
          if (res.data.data?.name) {
            document.title = res.data.data.name;
          }
          // Update favicon
          if (res.data.data?.favicon) {
            const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
            link.rel = 'icon';
            link.href = res.data.data.favicon;
            document.head.appendChild(link);
          }
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
