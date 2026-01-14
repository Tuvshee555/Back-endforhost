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
      where: { id: String(orderId) },
      select: {
        id: true,
        totalPrice: true,
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Lemon minimum amount
    const MIN_MNT = 1780;
    const total = Math.max(MIN_MNT, Math.round(Number(order.totalPrice) || 0));

    // keep payment row
    await prisma.lemonPayment.upsert({
      where: { orderId: order.id },
      update: { status: "PENDING" },
      create: { orderId: order.id, status: "PENDING" },
    });

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          custom_price: total,

          product_options: {
            redirect_url:
              redirectUrl ||
              `${process.env.FRONTEND_URL}/profile/orders/${order.id}`,
          },

          // Lemon requires this to be an array
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
    const checkoutUrl = checkoutData?.attributes?.url || null;

    if (!checkoutId || !checkoutUrl) {
      return res.status(500).json({ message: "Failed to create checkout" });
    }

    await prisma.lemonPayment.update({
      where: { orderId: order.id },
      data: { checkoutId, status: "PENDING" },
    });

    return res.status(200).json({ checkoutUrl, checkoutId });
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || null;

    console.error("❌ LEMON CHECKOUT ERROR STATUS:", status);
    console.error("❌ LEMON CHECKOUT ERROR DATA:", data);

    return res.status(status).json({
      message: "Failed to create checkout",
      status,
      data,
    });
  }
});

export default router;
