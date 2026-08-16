import assert from 'node:assert/strict';

import {
  formatOfficialVideoPriceRows,
  formatOfficialVideoPriceSummary,
  getOfficialVideoPriceRows,
} from './officialVideoPricing.js';

const model = {
  price_currency: 'USD',
  video_pricing: JSON.stringify({
    prices: [
      { label: '480p', price_per_second: 0.2205 },
      { label: '720p', price_per_second: 0.473 },
    ],
  }),
};

const finalMultiplier = 0.75 * 1.1;
assert.equal(finalMultiplier, 0.8250000000000001);
assert.deepEqual(getOfficialVideoPriceRows(model, finalMultiplier), [
  { label: '480p', price: 0.1819125 },
  { label: '720p', price: 0.390225 },
]);
assert.equal(
  formatOfficialVideoPriceSummary(model, finalMultiplier, 'USD', {
    symbol: '$',
    code: 'USD',
    rate: 1,
    usdRate: 1,
  }),
  '480p $0.1819/s · 720p $0.3902/s',
);
assert.deepEqual(
  formatOfficialVideoPriceRows(model, finalMultiplier, 'USD', {
    symbol: '¥',
    code: 'CNY',
    rate: 7.2,
    usdRate: 7.2,
  }).map((row) => row.formatted),
  ['¥1.3098/s', '¥2.8096/s'],
);
