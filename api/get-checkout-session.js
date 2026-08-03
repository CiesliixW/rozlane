const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = req.query.session_id;
  if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return res.status(400).json({ error: "Invalid session_id" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    return res.status(200).json({
      orderId: session.payment_intent || session.id,
      status: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      email: session.customer_details ? session.customer_details.email : null,
      phone: session.customer_details ? session.customer_details.phone : null,
      inpostPoint: session.metadata ? session.metadata.inpost_point : null,
      lineItems: (session.line_items ? session.line_items.data : []).map((li) => ({
        name: li.description,
        quantity: li.quantity,
        amountTotal: li.amount_total,
      })),
    });
  } catch (err) {
    return res.status(404).json({ error: "Nie znaleziono zamówienia" });
  }
};
