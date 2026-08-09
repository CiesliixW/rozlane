const SUPABASE_URL = "https://kzoatgaicyalkhfixydg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OYrq_0r2nW73B1IHuzi10g_dYYDbmFx";
const PRODUCT_IMAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/product-images/`;

let PRODUCTS = [];

function transformProductRow(row) {
  const filename = /\.\w+$/.test(row.image_filename) ? row.image_filename : `${row.image_filename}.png`;
  return {
    id: row.id,
    h: row.house,
    n: row.name,
    no: row.notes,
    pr: [Number(row.price_2ml), Number(row.price_5ml), Number(row.price_10ml), Number(row.price_30ml)],
    g: row.genders,
    best: row.best ? 1 : 0,
    img: PRODUCT_IMAGE_BASE + filename,
    r: row.rating,
    c: row.review_count,
  };
}

const productsReady = fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.asc`, {
  headers: { apikey: SUPABASE_ANON_KEY },
})
  .then((res) => {
    if (!res.ok) throw new Error("Failed to load products from Supabase");
    return res.json();
  })
  .then((rows) => {
    PRODUCTS.length = 0;
    PRODUCTS.push(...rows.map(transformProductRow));
  })
  .catch((err) => {
    console.error("Nie udało się wczytać katalogu produktów:", err);
  });
