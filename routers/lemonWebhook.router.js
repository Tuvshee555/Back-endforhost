// routers/lemonWebhook.router.js
import { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../prismaClient.js";

const lemonWebhookRouter = Router();

// IMPORTANT: If you add rate limiting / auth, ensure Lemon can reach this endpoint.

lemonWebhookRouter.post("/", async (req, res) => {
  try {
    const signature = req.get("X-Signature") || req.get("x-signature") || "";
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Webhook secret not set");
      return res.status(500).send("Webhook secret missing");
    }

    // raw buffer must exist (see server change)
    const raw = req.rawBody;
    if (!raw) {
      console.error("No raw body - signature cannot be verified");
      return res.status(400).send("Bad request");
    }

    // compute hmac sha256 hex
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(raw);
    const digest = hmac.digest("hex");

    // timing safe compare
    const digestBuf = Buffer.from(digest, "utf8");
    const sigBuf = Buffer.from(signature || "", "utf8");
    if (sigBuf.length === 0 || sigBuf.length !== digestBuf.length || !crypto.timingSafeEqual(digestBuf, sigBuf)) {
      console.warn("Invalid Lemon Squeezy signature");
      return res.status(400).send("Invalid signature");
    }

    // parsed body (express.json already parsed)
    const payload = req.body;

    // determine event name
    const eventName = payload?.meta?.event_name || payload?.meta?.event || null;

    // try to extract our internal order id (we passed it as checkout_data.custom.order_id)
    // Lemon places custom data in different spots in payloads; check multiple places
    let internalOrderId = null;
    if (payload?.data?.attributes?.custom_data && typeof payload.data.attributes.custom_data === "object") {
      internalOrderId = payload.data.attributes.custom_data.order_id || payload.data.attributes.custom_data.orderId;
    }
    if (!internalOrderId && payload?.meta?.custom_data) {
      internalOrderId = payload.meta.custom_data.order_id || payload.meta.custom_data.orderId;
    }
    if (!internalOrderId && payload?.data?.attributes?.checkout_data?.custom) {
      internalOrderId = payload.data.attributes.checkout_data.custom.order_id || payload.data.attributes.checkout_data.custom.orderId;
    }

    // also capture Lemon's order id if present
    const lemonOrderId = payload?.data?.id || null;

    // handle events
    if (eventName === "order_created" || eventName === "order_paid" || eventName === "subscription_payment_success") {
      // If we have internal order mapping, update our order to PAID
      if (internalOrderId) {
        const existing = await prisma.foodOrder.findUnique({ where: { id: internalOrderId } });
        if (existing) {
          // avoid repeating work if already marked PAID
          if (existing.status !== "PAID") {
            await prisma.foodOrder.update({
              where: { id: internalOrderId },
              data: { status: "PAID" },
            });
          }

          // upsert lemon payment record
          await prisma.lemonPayment.upsert({
            where: { orderId: internalOrderId },
            update: {
              lemonOrderId,
              status: "PAID",
            },
            create: {
              orderId: internalOrderId,
              lemonOrderId,
              status: "PAID",
            },
          });
        } else {
          console.warn("Webhook: internal order not found", internalOrderId);
        }
      } else {
        // optional: if you want to map by other details, implement here
        console.warn("Webhook: no internal order id found in payload.custom_data");
      }
    } else if (eventName === "order_refunded" || eventName === "subscription_payment_failed") {
      if (internalOrderId) {
        await prisma.foodOrder.update({
          where: { id: internalOrderId },
          data: { status: "CANCELLED" },
        });
        await prisma.lemonPayment.updateMany({
          where: { orderId: internalOrderId },
          data: { status: "REFUNDED" },
        });
      }
    }

    // Return 200 quickly (Lemon will retry on non-2xx)
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("LEMON WEBHOOK ERROR:", err);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
});

export default lemonWebhookRouter;
