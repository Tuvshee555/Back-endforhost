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
      include: {
        foodOrderItems: {
          include: { food: { select: { id: true, foodName: true, price: true } } },
        },
        user: { select: { email: true } },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    const items = (order.foodOrderItems || []).map((it) => ({
      foodId: it.food?.id || null,
      name: it.food?.foodName || "",
      qty: Number(it.quantity) || 0,
      unitPrice: Number(it.food?.price ?? 0),
      lineTotal: Number(it.food?.price ?? 0) * (Number(it.quantity) || 0),
    }));

    const itemsSummary = items
      .filter((x) => x.name && x.qty > 0)
      .slice(0, 12)
      .map((x) => `${x.name} x${x.qty}`)
      .join(", ");

    // Lemon min rule
    const MIN_MNT = 1780;
    const total = Math.max(MIN_MNT, Math.round(Number(order.totalPrice) || 0));

    console.log("🍋 LEMON checkout:", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalPrice: order.totalPrice,
      finalTotal: total,
      variantId: String(variantId),
    });

    await prisma.lemonPayment.upsert({
      where: { orderId: order.id },
      update: {},
      create: { orderId: order.id, status: "PENDING" },
    });

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: order.user?.email || undefined,

            // ✅ THIS IS THE CORRECT PLACE
            custom_price: total,

            custom: {
              order_id: String(order.id),
              order_number: String(order.orderNumber || ""),
              total_price: String(total),
              currency: "MNT",
              items_summary: String(itemsSummary || ""),
              items: JSON.stringify(items),
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
