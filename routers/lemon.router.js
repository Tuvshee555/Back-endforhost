// routers/lemon.router.js
import { Router } from "express";
import axios from "axios";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/requireAuth.js";
import rateLimit from "express-rate-limit";

const router = Router();

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/checkout", requireAuth, checkoutLimiter, async (req, res) => {
  try {
    const { orderId, variantId, redirectUrl } = req.body;

    if (!orderId || !variantId) {
      return res.status(400).json({ message: "orderId and variantId required" });
    }

    // 1) Fetch order (include status so we can block double-pay)
    const order = await prisma.foodOrder.findUnique({
      where: { id: String(orderId) },
      select: {
        id: true,
        orderNumber: true,
        totalPrice: true,
        status: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ Block invalid states
    if (order.status === "PAID") {
      return res.status(400).json({ message: "Order already paid" });
    }
    if (order.status === "CANCELLED") {
      return res.status(400).json({ message: "Order is cancelled" });
    }

    // 2) If checkout already exists and still pending -> reuse it (prevents duplicates)
    const existingPayment = await prisma.lemonPayment.findUnique({
      where: { orderId: order.id },
      select: {
        checkoutId: true,
        checkoutUrl: true,
        status: true,
      },
    });

    if (
      existingPayment?.checkoutUrl &&
      existingPayment?.status === "PENDING"
    ) {
      return res.status(200).json({
        checkoutUrl: existingPayment.checkoutUrl,
        checkoutId: existingPayment.checkoutId,
        reused: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
    }

    // 3) Compute total
    const totalMnt = Math.round(Number(order.totalPrice) || 0);

    // Lemon min price MNT 1780
    const safeMnt = Math.max(1780, totalMnt);

    // IMPORTANT: Lemon uses minor units => MNT × 100
    const lemonPrice = safeMnt * 100;

    // 4) Upsert payment row now (webhook mapping + tracking)
    await prisma.lemonPayment.upsert({
      where: { orderId: order.id },
      update: { status: "PENDING" },
      create: { orderId: order.id, status: "PENDING" },
    });

    // 5) Build super-safe Lemon payload
    // ✅ Keep custom values ONLY strings
    // ✅ Keep checkout_data as object
    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          custom_price: lemonPrice,

          checkout_data: {
            email: order.user?.email || undefined,
            custom: {
              // ✅ store identifiers as strings only
              order_id: String(order.id),
              order_number: String(order.orderNumber || ""),
              total_mnt: String(safeMnt),
              total_minor: String(lemonPrice),
              created_at: String(order.createdAt?.toISOString?.() || ""),
            },
          },

          product_options: {
            redirect_url:
              redirectUrl ||
              `${process.env.FRONTEND_URL}/profile/orders/${order.id}`,
          },

          // Lemon expects array
          checkout_options: [],

          test_mode: process.env.LEMON_TEST_MODE === "true",
        },

        relationships: {
          store: {
            data: { type: "stores", id: String(process.env.LEMON_STORE_ID) },
          },
          variant: {
            data: { type: "variants", id: String(variantId) },
          },
        },
      },
    };

    // ✅ Idempotency prevents duplicate checkout if double request happens
    const idempotencyKey = `order-${order.id}`;

    console.log("🍋 LEMON checkout request:", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalMnt: safeMnt,
      lemonPrice,
      variantId: String(variantId),
      idempotencyKey,
    });

    // 6) Call Lemon
    const apiRes = await axios.post(
      "https://api.lemonsqueezy.com/v1/checkouts",
      payload,
      {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${process.env.LEMON_API_KEY}`,
          "Idempotency-Key": idempotencyKey,
        },
        timeout: 12000,
      }
    );

    const checkoutData = apiRes.data?.data;
    const checkoutId = checkoutData?.id ? String(checkoutData.id) : null;
    const checkoutUrl = checkoutData?.attributes?.url;

    if (!checkoutId || !checkoutUrl) {
      return res.status(500).json({ message: "Failed to create checkout" });
    }

    // 7) Save checkout info for reuse + webhook mapping
    await prisma.lemonPayment.update({
      where: { orderId: order.id },
      data: {
        checkoutId,
        checkoutUrl, // ✅ IMPORTANT (allows reuse)
        status: "PENDING",
      },
    });

    return res.status(200).json({
      checkoutUrl,
      checkoutId,
      reused: false,

      // ✅ extra info for frontend/debug
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalMnt: safeMnt,
      lemonPrice,
    });
  } catch (err) {
    console.error("❌ LEMON CHECKOUT ERROR STATUS:", err?.response?.status);
    console.error("❌ LEMON CHECKOUT ERROR DATA:", err?.response?.data || err);

    return res.status(500).json({
      message: "Failed to create checkout",
      status: err?.response?.status,
      data: err?.response?.data,
    });
  }
});

export default router;
