import { Q } from '../api';

// Official prices (input $/1M tokens) for reference models.
// These are the REAL official API prices from Anthropic, OpenAI, Google etc.
// IMPORTANT: More specific patterns MUST come before less specific ones
// (e.g. "claude-opus-4-5" before "claude-opus-4") to avoid false matches.
// Patterns must match actual backend model_name format (e.g. "claude-opus-4-5-20251101").
const OFFICIAL_PRICES = [
  // Claude — order matters: longer/more-specific first
  { pattern: 'claude-opus-4-7', label: 'Claude Opus 4.7', inputPerMtok: 5, family: 'claudecode' },
  { pattern: 'claude-opus-4-5', label: 'Claude Opus 4.5', inputPerMtok: 5, family: 'claudecode' },
  { pattern: 'claude-opus-4-6', label: 'Claude Opus 4.6', inputPerMtok: 5, family: 'claudecode' },
  { pattern: 'claude-opus-4-1', label: 'Claude Opus 4.1', inputPerMtok: 15, family: 'claudecode' },
  { pattern: 'claude-opus-4', label: 'Claude Opus 4', inputPerMtok: 15, family: 'claudecode' },
  { pattern: 'claude-3-opus', label: 'Claude 3 Opus', inputPerMtok: 15, family: 'claudecode' },
  { pattern: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', inputPerMtok: 3, family: 'claudecode' },
  { pattern: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', inputPerMtok: 3, family: 'claudecode' },
  { pattern: 'claude-sonnet-4', label: 'Claude Sonnet 4', inputPerMtok: 3, family: 'claudecode' },
  { pattern: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet', inputPerMtok: 3, family: 'claudecode' },
  { pattern: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', inputPerMtok: 3, family: 'claudecode' },
  { pattern: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', inputPerMtok: 1, family: 'claudecode' },
  { pattern: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku', inputPerMtok: 0.8, family: 'claudecode' },
  { pattern: 'claude-3-haiku', label: 'Claude 3 Haiku', inputPerMtok: 0.25, family: 'claudecode' },
  // OpenAI — more specific first
  { pattern: 'gpt-4o-mini', label: 'GPT-4o Mini', inputPerMtok: 0.15, family: 'gpt' },
  { pattern: 'gpt-4o-2024-05-13', label: 'GPT-4o', inputPerMtok: 5, family: 'gpt' },
  { pattern: 'chatgpt-4o-latest', label: 'GPT-4o', inputPerMtok: 5, family: 'gpt' },
  { pattern: 'gpt-4o', label: 'GPT-4o', inputPerMtok: 2.5, family: 'gpt' },
  { pattern: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', inputPerMtok: 0.4, family: 'gpt' },
  { pattern: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', inputPerMtok: 0.1, family: 'gpt' },
  { pattern: 'gpt-4.1', label: 'GPT-4.1', inputPerMtok: 2, family: 'gpt' },
  { pattern: 'gpt-5.4', label: 'GPT-5.4', inputPerMtok: 2.5, family: 'gpt' },
  { pattern: 'gpt-5.3', label: 'GPT-5.3', inputPerMtok: 1.75, family: 'gpt' },
  { pattern: 'gpt-5.2', label: 'GPT-5.2', inputPerMtok: 1.75, family: 'gpt' },
  { pattern: 'gpt-5.1', label: 'GPT-5.1', inputPerMtok: 1.25, family: 'gpt' },
  // Gemini — more specific first
  { pattern: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', inputPerMtok: 0.04, family: 'gemini' },
  { pattern: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', inputPerMtok: 0.15, family: 'gemini' },
  { pattern: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', inputPerMtok: 1.25, family: 'gemini' },
  { pattern: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', inputPerMtok: 0.1, family: 'gemini' },
  { pattern: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', inputPerMtok: 1.25, family: 'gemini' },
  { pattern: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', inputPerMtok: 0.075, family: 'gemini' },
  // DeepSeek
  { pattern: 'deepseek-r1', label: 'DeepSeek R1', inputPerMtok: 0.55 },
  { pattern: 'deepseek-chat', label: 'DeepSeek V3', inputPerMtok: 0.27 },
  { pattern: 'deepseek-v3', label: 'DeepSeek V3', inputPerMtok: 0.27 },
];

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

    const modelName = (m.model_name || '').toLowerCase();

    for (const official of OFFICIAL_PRICES) {
      if (modelName.includes(official.pattern.toLowerCase())) {
        if (!official.family || !familyOrder.includes(official.family)) break;

        const sitePricePerMtok = siteInputPrice * 1000;
        const ratio = official.inputPerMtok / sitePricePerMtok;
        const equivDollars = quotaDollars * ratio;

        if (equivDollars > quotaDollars) {
          const currentBest = bestByFamily[official.family];
          if (!currentBest || equivDollars > currentBest.equivDollars) {
            bestByFamily[official.family] = {
              family: official.family,
              label: official.label,
              equivDollars,
            };
          }
        }
        break;
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

/**
 * Legacy single-result API (kept for compatibility).
 */
export function calcOfficialEquiv(models, quotaDollars) {
  const list = calcOfficialEquivList(models, quotaDollars);
  return list.length > 0 ? list[0] : null;
}
