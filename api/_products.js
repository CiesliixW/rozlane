// Not a route (underscore-prefixed files are excluded from Vercel's API routing).
// Fetches the product catalog from Supabase for server-side price validation --
// the canonical source is the `products` table, not js/products.js.

const SUPABASE_URL = "https://kzoatgaicyalkhfixydg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OYrq_0r2nW73B1IHuzi10g_dYYDbmFx";

async function fetchProducts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,house,name,price_2ml,price_5ml,price_10ml,price_30ml`, {
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch products from Supabase");
  }
  const rows = await res.json();
  return rows.map((row) => ({
    id: row.id,
    h: row.house,
    n: row.name,
    pr: [Number(row.price_2ml), Number(row.price_5ml), Number(row.price_10ml), Number(row.price_30ml)],
  }));
}

module.exports = { fetchProducts };
