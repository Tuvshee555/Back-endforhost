// controller/stripe/create-session.js
import Stripe from "stripe";
import { prisma } from "../../prismaClient.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const DEFAULT_CURRENCY = (process.env.PAYMENT_CURRENCY || "usd").toLowerCase();
// Stripe is off unless explicitly enabled — it is not part of the live
// payment flow (QPay / Lemon / COD / Bank are), and the store prices in MNT,
// which Stripe cannot settle. This guard prevents accidental mis-charges.
const STRIPE_ENABLED = process.env.STRIPE_ENABLED === "true";

// Currencies Stripe treats as zero-decimal: the amount is the whole unit,
// NOT cents. Multiplying MNT/JPY/KRW by 100 would overcharge 100x.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "mnt",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function toStripeAmount(value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return ZERO_DECIMAL_CURRENCIES.has(currency)
    ? Math.round(n)
    : Math.round(n * 100);
}

export async function createSession(req, res) {
  try {
    if (!STRIPE_ENABLED) {
      return res.status(503).json({ error: "Stripe checkout is not enabled" });
    }

    const { orderId } = req.body || {};
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const order = await prisma.foodOrder.findUnique({
      where: { id: String(orderId) },
      include: { foodOrderItems: { include: { food: true } } },
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    if (requesterRole !== "ADMIN" && order.userId !== requesterId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (["PAID", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({ error: "This order cannot be paid" });
    }

    if (!order.foodOrderItems.length) {
      return res.status(400).json({ error: "Order has no items" });
    }

    const line_items = [];
    for (const it of order.foodOrderItems) {
      const amount = toStripeAmount(it.food?.price, DEFAULT_CURRENCY);
      if (amount === null) {
        return res.status(400).json({ error: "Order item has an invalid price" });
      }
      line_items.push({
        price_data: {
          currency: DEFAULT_CURRENCY,
          product_data: { name: it.food?.foodName || `Item ${it.foodId}` },
          unit_amount: amount,
        },
        quantity: it.quantity || 1,
      });
    }

    const deliveryAmount = toStripeAmount(order.deliveryFee, DEFAULT_CURRENCY);
    if (deliveryAmount && deliveryAmount > 0) {
      line_items.push({
        price_data: {
          currency: DEFAULT_CURRENCY,
          product_data: { name: "Delivery Fee" },
          unit_amount: deliveryAmount,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      metadata: { orderId: String(order.id) },
      success_url: `${process.env.STRIPE_SUCCESS_URL}?orderId=${encodeURIComponent(order.id)}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}?orderId=${encodeURIComponent(order.id)}`,
    });

    try {
      await prisma.payment.create({
        data: {
          invoiceId: session.id,
          orderId: String(order.id),
          amount: Number(order.totalPrice ?? 0),
          status: "PENDING",
        },
      });
    } catch (e) {
      console.warn("createSession — payment record creation failed:", e?.message || e);
    }

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createSession error:", err?.message || err);
    return res.status(500).json({ error: "Server error creating session" });
  }
}
