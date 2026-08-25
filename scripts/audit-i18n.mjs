import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import highFrequencyTranslations from "../src/i18n/highFrequencyTranslations.js";
import journeyGapTranslations from "../src/i18n/journeyGapTranslations.js";
import legalPageTranslations from "../src/i18n/legalPageTranslations.js";
import appMarketTranslations from "../src/i18n/appMarketTranslations.js";
import sharedSubscriptionTranslations from "../src/i18n/sharedSubscriptionTranslations.js";
import sourceLocaleTranslations from "../src/i18n/sourceLocaleTranslations.js";
import longTailTranslations from "../src/i18n/longTailTranslations.js";
import pageGapTranslations from "../src/i18n/pageGapTranslations.js";
import subDistributorTranslations from "../src/i18n/subDistributorTranslations.js";
import pageTranslations from "../src/i18n/pageTranslations.js";
import siteCoreTranslations from "../src/i18n/siteCoreTranslations.js";
import siteTranslations from "../src/i18n/siteTranslations.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localeCodes = [
  "en",
  "zh",
  "zh-TW",
  "es",
  "pt-BR",
  "fr",
  "de",
  "ar",
  "ja",
  "id",
  "ru",
  "ko",
  "vi",
  "tr",
];
const criticalKeys = [
  ...Object.keys(highFrequencyTranslations.zh),
  ...Object.keys(JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en.json"), "utf8")).translation)
    .filter((key) => key.startsWith("legal.")),
  "pricing.allTypes",
  "pricing.typeChat",
  "pricing.typeCompletion",
  "pricing.typeEmbedding",
  "pricing.typeImage",
  "pricing.typeAudio",
  "pricing.typeVideo",
  "pricing.typeRerank",
  "pricing.type.chat",
  "pricing.type.completion",
  "pricing.type.embedding",
  "pricing.type.image",
  "pricing.type.audio",
  "pricing.type.video",
  "pricing.type.rerank",
  "packages.checkPricing",
  ...Object.keys(JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en.json"), "utf8")).translation)
    .filter((key) => key.startsWith("appMarket.")),
  ...new Set(Object.values(pageGapTranslations).flatMap((catalog) => Object.keys(catalog))),
  ...new Set(Object.values(subDistributorTranslations).flatMap((catalog) => Object.keys(catalog))),
];
const properNounKeys = new Set([
  "home.apiEndpointOverseasDirect",
  "appMarket.statusLive",
  "appMarket.featureAgents",
  "appMarket.openSource",
]);
const pageInvariantKeys = new Set([
  "officialChannels.multiplierLabel",
  "officialChannels.online",
  "appMarket.categoryEcommerce",
  "appMarket.featureStoryboard",
  "appMarket.featureMcp",
  "appMarket.featureLocalFirst",
  "appMarket.openSource",
  "appMarket.statusLive",
  "appMarket.featureAgents",
]);
const interpolationPattern = /{{\s*([^},\s]+)[^}]*}}/g;

const loadLocale = (locale) => {
  const source = JSON.parse(
    fs.readFileSync(path.join(root, "src/i18n/locales", `${locale}.json`), "utf8"),
  );
  return {
    ...(siteTranslations.en || {}),
    ...(source.translation || source),
    ...(siteTranslations[locale] || {}),
    ...(siteCoreTranslations[locale] || {}),
    ...(pageTranslations[locale] || {}),
    ...(highFrequencyTranslations[locale] || {}),
    ...(journeyGapTranslations[locale] || {}),
    ...(legalPageTranslations[locale] || {}),
    ...(appMarketTranslations[locale] || {}),
    ...(sharedSubscriptionTranslations[locale] || sharedSubscriptionTranslations.en || {}),
    ...(sourceLocaleTranslations[locale] || {}),
    ...(longTailTranslations[locale] || {}),
    ...(pageGapTranslations[locale] || {}),
    ...(subDistributorTranslations[locale] || {}),
  };
};

const getVariables = (value) =>
  [...String(value).matchAll(interpolationPattern)]
    .map((match) => match[1])
    .sort()
    .join(",");

const catalogs = Object.fromEntries(
  localeCodes.map((locale) => [locale, loadLocale(locale)]),
);
const errors = [];

for (const locale of Object.keys(pageTranslations)) {
  for (const [key, value] of Object.entries(pageTranslations[locale])) {
    const reference = catalogs.en[key] || key;
    const resolved = catalogs[locale][key];
    if (typeof resolved !== "string" || !resolved.trim()) {
      errors.push(`${locale}: missing page key "${key}"`);
      continue;
    }
    if (getVariables(resolved) !== getVariables(reference)) {
      errors.push(`${locale}: interpolation mismatch for page key "${key}"`);
    }
    if (!["zh-TW", "ja"].includes(locale) && /[㐀-鿿]/u.test(resolved)) {
      errors.push(`${locale}: Chinese text remains in page key "${key}": "${resolved}"`);
    }
    if (resolved === reference && !pageInvariantKeys.has(key)) {
      errors.push(`${locale}: English fallback remains in page key "${key}"`);
    }
  }
}

for (const locale of localeCodes.filter((code) => code !== "zh")) {
  for (const key of criticalKeys) {
    const value = catalogs[locale][key];
    const reference = catalogs.en[key];
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${locale}: missing critical key "${key}"`);
      continue;
    }
    if (getVariables(value) !== getVariables(reference)) {
      errors.push(`${locale}: interpolation mismatch for "${key}"`);
    }
    if (!["zh-TW", "ja"].includes(locale) && /[\u3400-\u9fff]/u.test(value)) {
      errors.push(`${locale}: Chinese text remains in "${key}": "${value}"`);
    }
    if (
      !["en", "zh-TW"].includes(locale) &&
      !properNounKeys.has(key) &&
      value.trim().toLocaleLowerCase() === reference.trim().toLocaleLowerCase() &&
      /\s|[.!?]/.test(reference) &&
      !/^(AI API|API only)$/i.test(reference)
    ) {
      errors.push(`${locale}: English fallback remains in "${key}": "${value}"`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Distributor i18n audit passed: ${criticalKeys.length} keys across ${localeCodes.length} locales.`,
  );
}
