export const DIST_SITE_LANGUAGE_STORAGE_KEY = 'dist_site_i18nextLng';

export const DIST_SITE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ar', label: 'العربية' },
  { code: 'ja', label: '日本語' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ru', label: 'Русский' },
  { code: 'ko', label: '한국어' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'tr', label: 'Türkçe' },
];

export const APP_LANGUAGE_CODES = DIST_SITE_LANGUAGES.map(({ code }) => code);

export const normalizeAppLanguage = (language) => {
  const normalized = String(language || '')
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();

  if (!normalized) return 'en';

  if (
    normalized === 'zh-tw' ||
    normalized.startsWith('zh-tw-') ||
    normalized === 'zh-hant' ||
    normalized.startsWith('zh-hant-') ||
    normalized === 'zh-hk' ||
    normalized.startsWith('zh-hk-') ||
    normalized === 'zh-mo' ||
    normalized.startsWith('zh-mo-')
  ) {
    return 'zh-TW';
  }

  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return 'zh';
  }

  if (normalized === 'pt' || normalized.startsWith('pt-')) {
    return 'pt-BR';
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
