const SIZES = ["2 ml", "5 ml", "10 ml", "30 ml"];

const PRICE_TABLE = {
  designer: [17.99, 39.99, 74.99, 199.00],
  premium: [24.99, 54.99, 99.00, 269.00],
  nisza: [34.99, 79.99, 149.00, 399.00],
  ultra: [49.99, 109.00, 199.00, 549.00],
};

// The product catalog itself lives in Supabase now:
// - browser: js/product-catalog.js fetches it into the PRODUCTS global
// - server (api/*.js): fetched fresh per-request, see api/_products.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SIZES, PRICE_TABLE };
}
