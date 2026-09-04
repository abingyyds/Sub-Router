import assert from 'node:assert/strict';

import { formatPricingDetailRows } from './pricingDetails.js';

const translations = {
  'pricing.inputPriceShort': '输入',
  'pricing.outputPriceShort': '输出',
  'pricing.cacheReadShort': '缓存读',
  'pricing.cacheCreationShort': '缓存创建',
  'pricing.cacheCreation1h': '1h缓存创建',
};
const t = (key) => translations[key] || key;

const rows = formatPricingDetailRows(
  {
    billing_type: 'tiered_expr',
    billing_mode: 'tiered_expr',
    billing_expr:
      'len <= 272000 ? tier("standard", p * 2 + c * 12 + cr * 0.2) : tier("long_context", p * 4 + c * 18 + cr * 0.4)',
    price_currency: 'USD',
    price_multiplier: 1.1,
  },
  { symbol: '$', code: 'USD', rate: 1, usdRate: 1 },
  t,
);

assert.deepEqual(
  rows.map(({ label, formatted }) => ({ label, formatted })),
  [
    { label: 'standard 输入', formatted: '$2.2000/M' },
    { label: 'standard 输出', formatted: '$13.2000/M' },
    { label: 'standard 缓存读', formatted: '$0.2200/M' },
    { label: 'long_context 输入', formatted: '$4.4000/M' },
    { label: 'long_context 输出', formatted: '$19.8000/M' },
    { label: 'long_context 缓存读', formatted: '$0.4400/M' },
  ],
);

assert.equal(
  formatPricingDetailRows(
    {
      billing_type: 'tiered_expr',
      billing_expr: 'tier("video", 10.13 * 1000000)',
      pricing_details: {
        type: 'video',
        currency: 'CNY',
        multiplier: 1,
        unit: 'second',
        items: [{ label: '720P', price: 10.13 }],
      },
    },
    { symbol: '¥', code: 'CNY', rate: 1, usdRate: 7 },
    t,
  )[0].formatted,
  '¥10.1300/s',
);
