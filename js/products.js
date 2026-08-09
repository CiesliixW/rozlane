const SIZES = ["2 ml", "5 ml", "10 ml", "30 ml"];

// The product catalog itself (including per-size prices) lives in Supabase now:
// - browser: js/product-catalog.js fetches it into the PRODUCTS global
// - server (api/*.js): fetched fresh per-request, see api/_products.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SIZES };
}
