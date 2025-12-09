import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const DEFAULT_CURRENCY = "usd"; // Stripe does not support MNT yet in Checkout

export async function createSession(req, res) {
  try {
    const { orderId, totalPrice } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id: Number(orderId) }, // 🔥 KEY FIX
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const line_items = order.items.map((item) => ({
      price_data: {
        currency: DEFAULT_CURRENCY,
        product_data: {
          name: item.name || `Item ${item.id}`,
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: Number(item.quantity),
    }));

    // Add delivery fee as a separate line item
    line_items.push({
      price_data: {
        currency: DEFAULT_CURRENCY,
        product_data: { name: "Delivery Fee" },
        unit_amount: Math.round(Number(order.deliveryFee) * 100),
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      metadata: { orderId: String(orderId) },
      success_url: `${process.env.STRIPE_SUCCESS_URL}?orderId=${orderId}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}?orderId=${orderId}`,
    });

    // Mark payment as PENDING first
    await prisma.payment.create({
      data: {
        invoiceId: session.id,
        orderId: Number(orderId),
        amount: Number(order.totalPrice),
        status: "PENDING",
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe createSession Error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
