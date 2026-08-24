import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import zh from './locales/zh.json';
import siteTranslations from './siteTranslations';
import {
  APP_LANGUAGE_CODES,
  DIST_SITE_LANGUAGE_STORAGE_KEY,
  normalizeAppLanguage,
} from './languageUtils';

const localeLoaders = {
  'zh-TW': () => import('./locales/zh-TW.json'),
  fr: () => import('./locales/fr.json'),
  ja: () => import('./locales/ja.json'),
  ru: () => import('./locales/ru.json'),
  vi: () => import('./locales/vi.json'),
  tr: () => import('./locales/tr.json'),
};

const localeBackend = {
  type: 'backend',
  read(language, _namespace, callback) {
    const normalizedLanguage = normalizeAppLanguage(language);
    const loader = localeLoaders[normalizedLanguage];
    if (!loader) {
      callback(new Error(`No locale loader for ${normalizedLanguage}`), false);
      return;
    }
    loader()
      .then((module) =>
        callback(null, {
          ...module.default.translation,
          ...(siteTranslations[normalizedLanguage] || siteTranslations.en),
        }),
      )
      .catch((error) => callback(error, false));
  },
};

i18n
  .use(LanguageDetector)
  .use(localeBackend)
  .use(initReactI18next)
  .init({
    load: 'all',
    supportedLngs: APP_LANGUAGE_CODES,
    nonExplicitSupportedLngs: true,
    resources: {
      zh: {
        translation: {
          ...zh.translation,
          ...siteTranslations.zh,
        },
      },
      en: {
        translation: {
          ...en.translation,
          ...siteTranslations.en,
        },
      },
    },
    partialBundledLanguages: true,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'querystring'],
      caches: ['localStorage'],
      lookupLocalStorage: DIST_SITE_LANGUAGE_STORAGE_KEY,
      convertDetectedLanguage: normalizeAppLanguage,
    },
  });

const syncDocumentLanguage = (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizeAppLanguage(language);
  }
};

i18n.on('languageChanged', syncDocumentLanguage);
syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);

export default i18n;
