// controller/stripe/webhook.js
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export async function webhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const raw = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout completion
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sessionId = session.id;
    const orderId = session.metadata?.orderId;

    try {
      // Update Payment record
      await prisma.payment.updateMany({
        where: { invoiceId: sessionId },
        data: { status: "PAID" },
      });

      // Update the related FoodOrder to reflect payment (adapt to your model)
      await prisma.foodOrder.updateMany({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      console.log(`Stripe: session ${sessionId} completed, order ${orderId} marked PAID.`);
    } catch (e) {
      console.error("DB update error in webhook:", e);
    }
  }

  res.json({ received: true });
}
