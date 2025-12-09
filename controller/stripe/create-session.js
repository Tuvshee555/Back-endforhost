// controller/stripe/create-session.js
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const DEFAULT_CURRENCY = "usd";

function cents(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export async function createSession(req, res) {
  try {
    // Debug: log incoming request body & headers (temporary, remove after fix)
    console.log("createSession — raw body:", req.body);
    console.log("createSession — headers:", {
      "content-type": req.headers["content-type"],
      host: req.headers.host,
    });

    // Validate presence
    const { orderId: rawOrderId, totalPrice } = req.body || {};
    if (typeof rawOrderId === "undefined" || rawOrderId === null || rawOrderId === "") {
      return res.status(400).json({ error: "Missing orderId in request body (received empty)", received: req.body });
    }

    // Try numeric id first
    const orderIdNum = Number(rawOrderId);
    let order = null;

    if (!Number.isNaN(orderIdNum)) {
      // numeric id path
      console.log("createSession — attempting numeric lookup with id =", orderIdNum);
      order = await prisma.foodOrder.findUnique({
        where: { id: orderIdNum },
        include: { items: true },
      }).catch((e) => {
        console.warn("createSession — numeric lookup failed:", e?.message || e);
        return null;
      });
    }

    // If not found and rawOrderId is a non-empty string, try string lookup (if your schema uses string ids)
    if (!order && typeof rawOrderId === "string") {
      console.log("createSession — attempting string lookup with id =", rawOrderId);
      order = await prisma.foodOrder.findUnique({
        where: { id: rawOrderId },
        include: { items: true },
      }).catch((e) => {
        console.warn("createSession — string lookup failed:", e?.message || e);
        return null;
      });
    }

    if (!order) {
      return res.status(404).json({
        error: "Order not found with provided orderId",
        providedOrderId: rawOrderId,
        note: "Server tried numeric and string lookups. Check type of foodOrder.id in your Prisma schema.",
      });
    }

    // Build line_items from order.items
    const line_items = (order.items || []).map((it) => {
      const unit = cents(it.price);
      if (unit === null) throw new Error(`Invalid item price for item id=${it.id}`);
      return {
        price_data: {
          currency: DEFAULT_CURRENCY,
          product_data: { name: it.name || `Item ${it.id}` },
          unit_amount: unit,
        },
        quantity: Number(it.quantity) || 1,
      };
    });

    // Add delivery fee if present
    if (typeof order.deliveryFee !== "undefined") {
      const d = cents(order.deliveryFee);
      if (d !== null && d > 0) {
        line_items.push({
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: { name: "Delivery Fee" },
            unit_amount: d,
          },
          quantity: 1,
        });
      }
    }

    if (!line_items.length) {
      return res.status(400).json({ error: "No items on order to create checkout session" });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      metadata: { orderId: String(order.id) },
      success_url: `${process.env.STRIPE_SUCCESS_URL}?orderId=${encodeURIComponent(order.id)}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}?orderId=${encodeURIComponent(order.id)}`,
    });

    // Create payment record (non-blocking)
    try {
      await prisma.payment.create({
        data: {
          invoiceId: session.id,
          orderId: typeof order.id === "number" ? order.id : String(order.id),
          amount: Number(order.totalPrice || totalPrice || 0),
          status: "PENDING",
        },
      });
    } catch (e) {
      console.warn("createSession — payment record creation failed:", e?.message || e);
    }

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createSession error:", err?.message || err, err?.stack || "");
    return res.status(500).json({ error: err?.message || "Server error creating session" });
  }
}
