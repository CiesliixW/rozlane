// Not a route (underscore-prefixed files are excluded from Vercel's API routing).
// Fetches the product catalog from Supabase for server-side price validation --
// the canonical source is the `products` table, not js/products.js.

const SUPABASE_URL = "https://kzoatgaicyalkhfixydg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OYrq_0r2nW73B1IHuzi10g_dYYDbmFx";

async function fetchProducts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,house,name,tier`, {
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch products from Supabase");
  }
  const rows = await res.json();
  return rows.map((row) => ({ id: row.id, h: row.house, n: row.name, t: row.tier }));
}

module.exports = { fetchProducts };
