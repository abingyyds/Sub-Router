import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import siteTranslations from "./siteTranslations";
import siteCoreTranslations from "./siteCoreTranslations";
import pageTranslations from "./pageTranslations";
import highFrequencyTranslations from "./highFrequencyTranslations";
import journeyGapTranslations from "./journeyGapTranslations";
import legalPageTranslations from "./legalPageTranslations";
import appMarketTranslations from "./appMarketTranslations";
import sharedSubscriptionTranslations from "./sharedSubscriptionTranslations";
import sourceLocaleTranslations from "./sourceLocaleTranslations";
import longTailTranslations from "./longTailTranslations";
import pageGapTranslations from "./pageGapTranslations";
import subDistributorTranslations from "./subDistributorTranslations";
import {
  APP_LANGUAGE_CODES,
  DIST_SITE_LANGUAGE_STORAGE_KEY,
  normalizeAppLanguage,
} from "./languageUtils";

const localeLoaders = {
  "zh-TW": () => import("./locales/zh-TW.json"),
  es: () => import("./locales/es.json"),
  "pt-BR": () => import("./locales/pt-BR.json"),
  fr: () => import("./locales/fr.json"),
  de: () => import("./locales/de.json"),
  ar: () => import("./locales/ar.json"),
  ja: () => import("./locales/ja.json"),
  id: () => import("./locales/id.json"),
  ru: () => import("./locales/ru.json"),
  ko: () => import("./locales/ko.json"),
  vi: () => import("./locales/vi.json"),
  tr: () => import("./locales/tr.json"),
};

const localeBackend = {
  type: "backend",
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
          ...(siteTranslations.en || {}),
          ...module.default.translation,
          ...(siteTranslations[normalizedLanguage] || {}),
          ...(siteCoreTranslations[normalizedLanguage] || {}),
          ...(pageTranslations[normalizedLanguage] || {}),
          ...(highFrequencyTranslations[normalizedLanguage] || {}),
          ...(journeyGapTranslations[normalizedLanguage] || {}),
          ...(legalPageTranslations[normalizedLanguage] || {}),
          ...(appMarketTranslations[normalizedLanguage] || {}),
          ...(sharedSubscriptionTranslations[normalizedLanguage] || sharedSubscriptionTranslations.en || {}),
          ...(sourceLocaleTranslations[normalizedLanguage] || {}),
          ...(longTailTranslations[normalizedLanguage] || {}),
          ...(pageGapTranslations[normalizedLanguage] || {}),
          ...(subDistributorTranslations[normalizedLanguage] || {}),
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
    load: "all",
    supportedLngs: APP_LANGUAGE_CODES,
    resources: {
      zh: {
        translation: {
          ...zh.translation,
          ...siteTranslations.zh,
          ...siteCoreTranslations.zh,
          ...pageTranslations.zh,
          ...highFrequencyTranslations.zh,
          ...(journeyGapTranslations.zh || {}),
          ...(legalPageTranslations.zh || {}),
          ...(appMarketTranslations.zh || {}),
          ...(sharedSubscriptionTranslations.zh || {}),
          ...(sourceLocaleTranslations.zh || {}),
          ...(longTailTranslations.zh || {}),
          ...(pageGapTranslations.zh || {}),
          ...(subDistributorTranslations.zh || {}),
        },
      },
      en: {
        translation: {
          ...en.translation,
          ...siteTranslations.en,
          ...siteCoreTranslations.en,
          ...pageTranslations.en,
          ...highFrequencyTranslations.en,
          ...(journeyGapTranslations.en || {}),
          ...(legalPageTranslations.en || {}),
          ...(appMarketTranslations.en || {}),
          ...(sharedSubscriptionTranslations.en || {}),
          ...(sourceLocaleTranslations.en || {}),
          ...(longTailTranslations.en || {}),
          ...(pageGapTranslations.en || {}),
          ...(subDistributorTranslations.en || {}),
        },
      },
    },
    partialBundledLanguages: true,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag", "querystring"],
      caches: ["localStorage"],
      lookupLocalStorage: DIST_SITE_LANGUAGE_STORAGE_KEY,
      convertDetectedLanguage: normalizeAppLanguage,
    },
  });

const syncDocumentLanguage = (language) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalizeAppLanguage(language);
    document.documentElement.dir =
      normalizeAppLanguage(language) === "ar" ? "rtl" : "ltr";
  }
};

i18n.on("languageChanged", syncDocumentLanguage);
syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);

export default i18n;
