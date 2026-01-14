// routers/lemon.router.js
import { Router } from "express";
import axios from "axios";
import { prisma } from "../prismaClient.js";

const router = Router();

router.post("/checkout", async (req, res) => {
  try {
    const { orderId, variantId, redirectUrl } = req.body;

    if (!orderId || !variantId) {
      return res.status(400).json({ message: "orderId and variantId required" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        totalPrice: true,
        user: { select: { email: true } },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ total in MNT
    const totalMnt = Math.round(Number(order.totalPrice) || 0);

    // ✅ Lemon requires min price 1780 MNT
    const safeMnt = Math.max(1780, totalMnt);

    // ✅ IMPORTANT: Lemon needs "minor units"
    // MNT needs ×100
    const lemonPrice = safeMnt * 100;

    console.log("🍋 LEMON checkout request:", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalMnt: safeMnt,
      lemonPrice,
      variantId: String(variantId),
    });

    // store payment row
    await prisma.lemonPayment.upsert({
      where: { orderId: order.id },
      update: { status: "PENDING" },
      create: { orderId: order.id, status: "PENDING" },
    });

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          custom_price: lemonPrice,

          checkout_data: {
            email: order.user?.email || undefined,
            custom: {
              order_id: String(order.id),
            },
          },

          product_options: {
            redirect_url:
              redirectUrl ||
              `${process.env.FRONTEND_URL}/profile/orders/${order.id}`,
          },

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

    const apiRes = await axios.post(
      "https://api.lemonsqueezy.com/v1/checkouts",
      payload,
      {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${process.env.LEMON_API_KEY}`,
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

    await prisma.lemonPayment.update({
      where: { orderId: order.id },
      data: { checkoutId, status: "PENDING" },
    });

    return res.status(200).json({ checkoutUrl, checkoutId });
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
