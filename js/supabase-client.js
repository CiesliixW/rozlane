// Requires the Supabase JS SDK loaded first via:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// Not wired into any page yet — this only prepares the client for later use
// once the `products` table and `product-images` bucket exist in Supabase.

const SUPABASE_URL = "https://kzoatgaicyalkhfixydg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OYrq_0r2nW73B1IHuzi10g_dYYDbmFx";

const Supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
