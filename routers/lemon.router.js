// routers/lemon.router.js
import { Router } from "express";
import axios from "axios";
import { prisma } from "../prismaClient.js";

const router = Router();

/**
 * POST /payment/lemon/checkout
 * Body: { orderId: string, variantId: string|number, redirectUrl?: string }
 * Returns: { checkoutUrl, checkoutId }
 */
router.post("/checkout", async (req, res) => {
  try {
    const { orderId, variantId, redirectUrl } = req.body;

    if (!orderId || !variantId) {
      return res.status(400).json({ message: "orderId and variantId required" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, totalPrice: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    await prisma.lemonPayment.upsert({
      where: { orderId },
      update: {},
      create: { orderId, status: "PENDING" },
    });

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          // ✅ safest working fields:
          custom_price: null,
          product_options: {
            redirect_url:
              redirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
          },
          checkout_options: [], // ✅ must be array
          checkout_data: {
            custom: {
              order_id: orderId,
              internal_order_number: order.orderNumber,
            },
          },
          test_mode: process.env.LEMON_TEST_MODE === "true",
        },
        relationships: {
          store: {
            data: { type: "stores", id: String(process.env.LEMON_STORE_ID) },
          },
          variant: {
            data: { type: "variants", id: String(variantId) }, // ✅ string id
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
    const checkoutId = checkoutData?.id;
    const checkoutUrl = checkoutData?.attributes?.url;

    if (!checkoutId || !checkoutUrl) {
      return res.status(500).json({ message: "Failed to create checkout" });
    }

    await prisma.lemonPayment.update({
      where: { orderId },
      data: {
        checkoutId: String(checkoutId),
        status: "PENDING",
      },
    });

    return res.status(200).json({ checkoutId, checkoutUrl });
  } catch (err) {
    console.error("LEMON CHECKOUT ERROR:", err?.response?.data || err);
    return res.status(500).json({ message: "Failed to create checkout" });
  }
});

export default router;
