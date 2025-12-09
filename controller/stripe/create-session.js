// controller/stripe/create-session.js
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export async function createSession(req, res) {
  try {
    const { orderId, totalPrice } = req.body;
    if (!orderId || !totalPrice) {
      return res.status(400).json({ error: "Missing orderId or totalPrice" });
    }

    const successUrl = `${process.env.STRIPE_SUCCESS_URL}?orderId=${encodeURIComponent(orderId)}`;
    const cancelUrl = `${process.env.STRIPE_CANCEL_URL}?orderId=${encodeURIComponent(orderId)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Order #${orderId}` },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { orderId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Save a Payment record (non-blocking if DB fails)
    try {
      await prisma.payment.create({
        data: {
          invoiceId: session.id,
          orderId,
          amount: totalPrice,
          status: "PENDING",
        },
      });
    } catch (e) {
      console.warn("Could not create Payment record:", e.message || e);
    }

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createSession error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
