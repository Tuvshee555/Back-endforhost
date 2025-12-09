// controller/stripe/create-session.js
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const DEFAULT_CURRENCY = process.env.PAYMENT_CURRENCY || "usd"; // change to "mnt" if you use MNT and Stripe supports it
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || `${process.env.NEXT_PUBLIC_DOMAIN}/checkout/payment-success`;
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || `${process.env.NEXT_PUBLIC_DOMAIN}/checkout/payment-failed`;

function toCents(amount) {
  // ensure numeric and produce integer cents (Stripe expects integer)
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export async function createSession(req, res) {
  try {
    // Basic environment check (helpful during debugging)
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set in env!");
      return res.status(500).json({ error: "Server config error: missing stripe key" });
    }

    const { orderId, totalPrice, items } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId in request body" });
    }

    // Build line_items either from client-provided `items` or from DB order record
    let line_items = [];
    let currency = DEFAULT_CURRENCY;
    let computedTotal = totalPrice;

    if (Array.isArray(items) && items.length) {
      // expected item shape: { name, unit_price, quantity, image (optional), currency (optional) }
      line_items = items.map((i) => {
        const unitCents = toCents(i.unit_price);
        if (unitCents === null) {
          throw new Error(`Invalid unit_price for item ${JSON.stringify(i)}`);
        }
        return {
          price_data: {
            currency: i.currency || DEFAULT_CURRENCY,
            product_data: {
              name: i.name || "Item",
              ...(i.image ? { images: [i.image] } : {}),
            },
            unit_amount: unitCents,
          },
          quantity: Number(i.quantity) || 1,
        };
      });
    } else {
      // Fallback: read order items from DB (assumes you have a related items table)
      const order = await prisma.foodOrder.findUnique({
        where: { id: Number(orderId) },
        include: { items: true }, // adjust to match your schema
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // example: order.items should have fields { name, price, quantity, image }
      line_items = (order.items || []).map((it) => {
        const unitCents = toCents(it.price);
        if (unitCents === null) throw new Error(`Invalid price on DB item id=${it.id}`);
        return {
          price_data: {
            currency: order.currency || DEFAULT_CURRENCY,
            product_data: {
              name: it.name || `Product ${it.id}`,
              ...(it.image ? { images: [it.image] } : {}),
            },
            unit_amount: unitCents,
          },
          quantity: Number(it.quantity) || 1,
        };
      });

      // prefer DB total if present
      if (typeof order.totalPrice !== "undefined") computedTotal = order.totalPrice;
      if (order.currency) currency = order.currency;
    }

    if (!line_items.length) {
      return res.status(400).json({ error: "No line items available for checkout" });
    }

    // optional: add delivery fee line item if you keep it separate
    // e.g. line_items.push({...})

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      metadata: { orderId: String(orderId) },
      success_url: `${SUCCESS_URL}?orderId=${encodeURIComponent(orderId)}`,
      cancel_url: `${CANCEL_URL}?orderId=${encodeURIComponent(orderId)}`,
    });

    // Optionally create Payment record here if you want immediate tracking
    try {
      await prisma.payment.create({
        data: {
          invoiceId: session.id,
          orderId: String(orderId),
          amount: Number(computedTotal) || 0,
          status: "PENDING",
        },
      });
    } catch (e) {
      console.warn("Failed creating payment record (non-blocking):", e?.message || e);
    }

    return res.json({ url: session.url });
  } catch (err) {
    // Helpful, explicit logging for debugging
    console.error("createSession error:", err?.message || err, err?.stack || "");
    // During development return the real error message. Remove or hide in production.
    const show = process.env.NODE_ENV !== "production";
    return res.status(500).json({ error: show ? (err?.message || "Server error") : "Server error" });
  }
}
