export const APP_LANGUAGE_CODES = ['zh', 'en'];

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
