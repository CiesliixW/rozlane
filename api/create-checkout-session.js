const Stripe = require("stripe");
const { PRICE_TABLE, SIZES } = require("../js/products.js");
const Promotions = require("../js/promotions.js");
const { fetchProducts } = require("./_products.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SHIPPING_PRICE = 16.99;

// `origin` in the request body is client-supplied and must never be trusted
// directly -- it feeds success_url/cancel_url, so an unvalidated value would
// let anyone redirect a real, paid customer to an attacker's domain.
const PRODUCTION_ORIGINS = ["https://rozlane.pl", "https://www.rozlane.pl"];
const PREVIEW_ORIGIN_PATTERN = /^https:\/\/rozlane(-[a-z0-9-]+)?\.vercel\.app$/;

function resolveBaseUrl(origin) {
  if (typeof origin === "string" && (PRODUCTION_ORIGINS.includes(origin) || PREVIEW_ORIGIN_PATTERN.test(origin))) {
    return origin;
  }
  return PRODUCTION_ORIGINS[0];
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { items, origin, deliveryPoint } = body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }
  if (!deliveryPoint || typeof deliveryPoint.code !== "string" || !deliveryPoint.code.trim()) {
    return res.status(400).json({ error: "Missing InPost parcel locker selection" });
  }

  let products;
  try {
    products = await fetchProducts();
  } catch (err) {
    console.error("fetchProducts failed:", err);
    return res.status(500).json({ error: "Nie udało się pobrać katalogu produktów", detail: err.message });
  }

  const validatedItems = [];
  const line_items = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    const sizeIndex = SIZES.indexOf(item.size);
    const qty = Number(item.qty);
    if (!product || sizeIndex === -1 || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({ error: `Invalid cart item: ${item.id}` });
    }
    const price = PRICE_TABLE[product.t][sizeIndex];
    validatedItems.push({ id: item.id, size: item.size, qty });
    line_items.push({
      price_data: {
        currency: "pln",
        product_data: { name: `${product.h} ${product.n} - Odlewka perfum - ${item.size}` },
        unit_amount: Math.round(price * 100),
      },
      quantity: qty,
    });
  }

  const promo = Promotions.computePromo(validatedItems, products);
  const shippingAmount = promo.freeShipping ? 0 : Math.round(SHIPPING_PRICE * 100);

  const baseUrl = resolveBaseUrl(origin);
  const metadata = {
    inpost_point: deliveryPoint.code,
    inpost_address: (deliveryPoint.address || "").slice(0, 500),
  };

  try {
    const sessionParams = {
      mode: "payment",
      line_items,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["PL"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingAmount, currency: "pln" },
            display_name: promo.freeShipping
              ? `InPost Paczkomat (${deliveryPoint.code}) - gratis`
              : `InPost Paczkomat (${deliveryPoint.code})`,
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
    };

    if (promo.discount > 0) {
      // Stripe rejects a session that sets both `discounts` and
      // `allow_promotion_codes`, so the site's own automatic gratis-item
      // discount takes priority over letting the customer type a code.
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(promo.discount * 100),
        currency: "pln",
        duration: "once",
        name: "Promocja odlewek",
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return res.status(500).json({ error: "Nie udało się utworzyć sesji płatności", detail: err.message, code: err.code || err.type });
  }
};
