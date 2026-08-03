const Stripe = require("stripe");
const { PRODUCTS, PRICE_TABLE, SIZES } = require("../js/products.js");
const Promotions = require("../js/promotions.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SHIPPING_PRICE = 16.99;

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

  const validatedItems = [];
  const line_items = [];
  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.id);
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
        product_data: { name: `${product.h} ${product.n} — ${item.size}` },
        unit_amount: Math.round(price * 100),
      },
      quantity: qty,
    });
  }

  const promo = Promotions.computePromo(validatedItems);
  const shippingAmount = promo.freeShipping ? 0 : Math.round(SHIPPING_PRICE * 100);

  const baseUrl = origin || `https://${req.headers.host}`;
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
              ? `InPost Paczkomat (${deliveryPoint.code}) — gratis`
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
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(promo.discount * 100),
        currency: "pln",
        duration: "once",
        name: "Promocja odlewek",
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: "Nie udało się utworzyć sesji płatności" });
  }
};
