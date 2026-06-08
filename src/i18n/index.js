import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import zh from './locales/zh.json';
import {
  APP_LANGUAGE_CODES,
  DIST_SITE_LANGUAGE_STORAGE_KEY,
  normalizeAppLanguage,
} from './languageUtils';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    load: 'all',
    supportedLngs: APP_LANGUAGE_CODES,
    nonExplicitSupportedLngs: true,
    resources: { en, zh },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'querystring'],
      caches: ['localStorage'],
      lookupLocalStorage: DIST_SITE_LANGUAGE_STORAGE_KEY,
      convertDetectedLanguage: normalizeAppLanguage,
    },
  });

export default i18n;
