// routers/lemonWebhook.router.js
import { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../prismaClient.js";
import { incrementSalesForOrder } from "../utils/orderPaid.js";
import { restockOrder } from "../utils/stock.js";

const router = Router();

function get(obj, path) {
  try {
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  } catch {
    return undefined;
  }
}

router.post("/", async (req, res) => {
  try {
    console.log("✅ LEMON WEBHOOK HIT");
    const eventName = req.body?.meta?.event_name;
    console.log("Event:", eventName);

    // ---- signature verify ----
    const signature = req.get("X-Signature") || req.get("x-signature") || "";
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("❌ Missing LEMON_SQUEEZY_WEBHOOK_SECRET");
      return res.status(500).send("Webhook secret missing");
    }

    const raw = req.rawBody;
    if (!raw) {
      console.error("❌ Missing rawBody (express.json verify not set)");
      return res.status(400).send("Bad request");
    }

    const digest = crypto.createHmac("sha256", secret).update(raw).digest("hex");

    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signature, "utf8");

    if (!signature || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn("❌ Invalid Lemon signature");
      return res.status(400).send("Invalid signature");
    }

    console.log("✅ SIGNATURE OK");

    const payload = req.body;

    // ---- IDs from Lemon ----
    const lemonOrderId = payload?.data?.id ? String(payload.data.id) : null;
    const checkoutId =
      payload?.data?.attributes?.checkout_id ||
      payload?.data?.attributes?.checkout?.id ||
      payload?.data?.attributes?.checkout ||
      null;

    // ---- try to extract our internal orderId from many possible places ----
    const candidates = [
      get(payload, "data.attributes.custom_data.order_id"),
      get(payload, "data.attributes.custom_data.orderId"),
      get(payload, "meta.custom_data.order_id"),
      get(payload, "meta.custom_data.orderId"),
      get(payload, "data.attributes.checkout_data.custom.order_id"),
      get(payload, "data.attributes.checkout_data.custom.orderId"),
      get(payload, "data.attributes.custom.order_id"),
      get(payload, "data.attributes.custom.orderId"),
    ];

    let internalOrderId = candidates.find((x) => typeof x === "string" && x.length > 10) || null;

    console.log("internalOrderId:", internalOrderId);
    console.log("lemonOrderId:", lemonOrderId);
    console.log("checkoutId:", checkoutId);

    // ---- fallback: map by checkoutId from our LemonPayment row ----
    if (!internalOrderId && checkoutId) {
      const lp = await prisma.lemonPayment.findFirst({
        where: { checkoutId: String(checkoutId) },
        select: { orderId: true },
      });
      internalOrderId = lp?.orderId || null;
      console.log("mapped by checkoutId → internalOrderId:", internalOrderId);
    }

    // if still missing, just acknowledge webhook
    if (!internalOrderId) {
      console.warn("⚠️ Could not resolve internal order id, skipping DB update");
      return res.status(200).json({ received: true, skipped: true });
    }

    // ---- event handling ----
    const PAID_EVENTS = new Set([
      "order_created",
      "order_paid",
      "subscription_payment_success",
    ]);

    const REFUND_EVENTS = new Set([
      "order_refunded",
      "subscription_payment_failed",
    ]);

    if (PAID_EVENTS.has(eventName)) {
      // Check the current status first so duplicate paid events
      // (e.g. order_created + order_paid) don't double-count the sale.
      const current = await prisma.foodOrder.findUnique({
        where: { id: internalOrderId },
        select: { status: true },
      });

      if (!current) {
        console.warn("⚠️ Lemon paid event for unknown order:", internalOrderId);
        return res.status(200).json({ received: true, skipped: true });
      }

      const wasPaid = current.status === "PAID";

      // update Order
      await prisma.foodOrder.update({
        where: { id: internalOrderId },
        data: { status: "PAID" },
      });

      // update LemonPayment
      await prisma.lemonPayment.upsert({
        where: { orderId: internalOrderId },
        update: {
          lemonOrderId: lemonOrderId ? String(lemonOrderId) : undefined,
          status: "PAID",
        },
        create: {
          orderId: internalOrderId,
          lemonOrderId: lemonOrderId ? String(lemonOrderId) : null,
          status: "PAID",
        },
      });

      // Count the sale only on the first PAID transition.
      if (!wasPaid) {
        try {
          await incrementSalesForOrder(internalOrderId);
        } catch (salesErr) {
          console.error("❌ Failed to increment salesCount (lemon):", salesErr);
        }
      }

      console.log("✅ ORDER UPDATED TO PAID:", internalOrderId);
    } else if (REFUND_EVENTS.has(eventName)) {
      const current = await prisma.foodOrder.findUnique({
        where: { id: internalOrderId },
        select: { status: true },
      });

      await prisma.foodOrder.update({
        where: { id: internalOrderId },
        data: { status: "CANCELLED" },
      });

      await prisma.lemonPayment.updateMany({
        where: { orderId: internalOrderId },
        data: { status: "REFUNDED" },
      });

      // Release reserved stock once (skip if already cancelled).
      if (current && current.status !== "CANCELLED") {
        await restockOrder(internalOrderId);
      }

      console.log("✅ ORDER UPDATED TO CANCELLED/REFUNDED:", internalOrderId);
    } else {
      console.log("ℹ️ Ignored event:", eventName);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ LEMON WEBHOOK ERROR:", err);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
});

export default router;
