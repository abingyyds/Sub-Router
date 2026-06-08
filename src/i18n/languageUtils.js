export const DIST_SITE_LANGUAGE_STORAGE_KEY = 'dist_site_i18nextLng';

export const DIST_SITE_LANGUAGES = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
];

export const APP_LANGUAGE_CODES = DIST_SITE_LANGUAGES.map(({ code }) => code);

export const normalizeAppLanguage = (language) => {
  const normalized = String(language || '')
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();

  if (!normalized) return 'en';

  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return 'zh';
  }

  const baseLanguage = normalized.split('-')[0];
  return APP_LANGUAGE_CODES.includes(baseLanguage) ? baseLanguage : 'en';
};

export const getStoredAppLanguage = () => {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(DIST_SITE_LANGUAGE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};
