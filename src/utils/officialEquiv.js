import { Q } from '../api';

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function getOfficialPrice(model) {
  if (!model || typeof model !== 'object') return null;

  const inputPerMtok = Number(model.official_input_price);
  const outputPerMtok = Number(model.official_output_price);
  if (!Number.isFinite(inputPerMtok) || inputPerMtok <= 0) return null;

  return {
    label: model.display_name || model.model_name,
    inputPerMtok,
    outputPerMtok: Number.isFinite(outputPerMtok) && outputPerMtok > 0 ? outputPerMtok : null,
    cacheReadPerMtok: numberOrNull(model.official_cache_read_price),
    cacheCreationPerMtok: numberOrNull(model.official_cache_creation_price),
    cacheCreation1hPerMtok: numberOrNull(model.official_cache_creation_price_1h),
  };
}

/**
 * Find official equivalents for the three headline families only:
 * GPT, Claude Code, and Gemini.
 * Returns at most one best result per family, in fixed display order.
 */
export function calcOfficialEquivList(models, quotaDollars) {
  if (!models || models.length === 0 || quotaDollars <= 0) return [];

  const familyOrder = ['gpt', 'claudecode', 'gemini'];
  const bestByFamily = {};

  for (const m of models) {
    const siteInputPrice = Number(m.input_price);
    if (!siteInputPrice || siteInputPrice <= 0) continue;

    const official = getOfficialPrice(m);
    if (!official) continue;

    const family = getOfficialFamily(m.model_name || m.display_name || '');
    if (!family || !familyOrder.includes(family)) continue;

    const sitePricePerMtok = siteInputPrice * 1000;
    const ratio = official.inputPerMtok / sitePricePerMtok;
    const equivDollars = quotaDollars * ratio;

    if (equivDollars > quotaDollars) {
      const currentBest = bestByFamily[family];
      if (!currentBest || equivDollars > currentBest.equivDollars) {
        bestByFamily[family] = {
          family,
          label: official.label,
          equivDollars,
        };
      }
    }
  }

  return familyOrder
    .map((family) => bestByFamily[family])
    .filter(Boolean)
    .map((item) => ({
      label: item.label,
      equivDollars: Math.round(item.equivDollars),
    }));
}

function getOfficialFamily(modelName) {
  const name = String(modelName).toLowerCase();
  if (name.includes('gpt')) return 'gpt';
  if (name.includes('claude')) return 'claudecode';
  if (name.includes('gemini')) return 'gemini';
  return null;
}

/**
 * Legacy single-result API (kept for compatibility).
 */
export function calcOfficialEquiv(models, quotaDollars) {
  const list = calcOfficialEquivList(models, quotaDollars);
  return list.length > 0 ? list[0] : null;
}
