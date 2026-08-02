const Stripe = require("stripe");
const { PRODUCTS, PRICE_TABLE, SIZES } = require("../js/products.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  const { items, origin } = body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  const line_items = [];
  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.id);
    const sizeIndex = SIZES.indexOf(item.size);
    const qty = Number(item.qty);
    if (!product || sizeIndex === -1 || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({ error: `Invalid cart item: ${item.id}` });
    }
    const price = PRICE_TABLE[product.t][sizeIndex];
    line_items.push({
      price_data: {
        currency: "pln",
        product_data: { name: `${product.h} ${product.n} — ${item.size}` },
        unit_amount: Math.round(price * 100),
      },
      quantity: qty,
    });
  }

  const baseUrl = origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: "Nie udało się utworzyć sesji płatności" });
  }
};
