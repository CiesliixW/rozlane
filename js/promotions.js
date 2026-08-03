const _deps = (typeof module !== "undefined" && module.exports) ? require("./products.js") : null;
const _SIZES = _deps ? _deps.SIZES : SIZES;
const _PRICE_TABLE = _deps ? _deps.PRICE_TABLE : PRICE_TABLE;
const _PRODUCTS = _deps ? _deps.PRODUCTS : PRODUCTS;

// "Nie łączymy 5 z 2" — each size below has its own independent set of tiers.
const PROMO_RULES = {
  "5 ml": { freeShippingAt: 2, freeItemTiers: [{ at: 4, count: 1 }] },
  "2 ml": { freeShippingAt: 3, freeItemTiers: [{ at: 6, count: 1 }] },
};

const SPRAYS_PER_ML = 20; // 2 ml ≈ 40 psiknięć

function spraysForSize(size) {
  const ml = parseFloat(size);
  return Math.round(ml * SPRAYS_PER_ML);
}

function unitPricesForSize(items, size) {
  const prices = [];
  for (const item of items) {
    if (item.size !== size) continue;
    const product = _PRODUCTS.find((p) => p.id === item.id);
    if (!product) continue;
    const sizeIndex = _SIZES.indexOf(size);
    const price = _PRICE_TABLE[product.t][sizeIndex];
    for (let i = 0; i < item.qty; i++) prices.push(price);
  }
  return prices;
}

function freeItemCountFor(rule, count) {
  let free = 0;
  for (const tier of rule.freeItemTiers) {
    if (count >= tier.at) free = tier.count;
  }
  return free;
}

// items: [{ id, size, qty }] — same shape as the cart lines / validated checkout items.
function computePromo(items) {
  let freeShipping = false;
  let discount = 0;
  const bySize = {};

  for (const size of Object.keys(PROMO_RULES)) {
    const rule = PROMO_RULES[size];
    const unitPrices = unitPricesForSize(items, size).sort((a, b) => a - b);
    const count = unitPrices.length;
    const sizeFreeShipping = count >= rule.freeShippingAt;
    const freeCount = freeItemCountFor(rule, count);
    const freeValue = unitPrices.slice(0, freeCount).reduce((s, p) => s + p, 0);

    bySize[size] = { count, freeShipping: sizeFreeShipping, freeCount, freeValue };
    if (sizeFreeShipping) freeShipping = true;
    discount += freeValue;
  }

  return { freeShipping, discount, bySize };
}

// Progress towards the next unmet tier for a single size — used to build UI messages.
function getSizeStatus(size, count) {
  const rule = PROMO_RULES[size];
  if (!rule) return null;
  const freeShippingRemaining = Math.max(0, rule.freeShippingAt - count);
  const currentFreeCount = freeItemCountFor(rule, count);
  const nextTier = rule.freeItemTiers.find((t) => t.at > count) || null;
  return {
    count,
    freeShippingMet: freeShippingRemaining === 0,
    freeShippingRemaining,
    currentFreeCount,
    nextFreeTier: nextTier ? { remaining: nextTier.at - count, count: nextTier.count } : null,
  };
}

const Promotions = { PROMO_RULES, spraysForSize, computePromo, getSizeStatus };

if (typeof module !== "undefined" && module.exports) {
  module.exports = Promotions;
}
