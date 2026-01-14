// routers/lemon.router.js
import { Router } from "express";
import axios from "axios";
import { prisma } from "../prismaClient.js";

const router = Router();

/**
 * POST /payment/lemon/checkout
 * Body:
 * {
 *   orderId: string,
 *   variantId: string|number,
 *   redirectUrl?: string
 * }
 */
router.post("/checkout", async (req, res) => {
  try {
    const { orderId, variantId, redirectUrl } = req.body;

    if (!orderId || !variantId) {
      return res
        .status(400)
        .json({ message: "orderId and variantId required" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id: String(orderId) },
      include: {
        foodOrderItems: {
          include: {
            food: {
              select: { id: true, foodName: true, price: true },
            },
          },
        },
        user: { select: { email: true } },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // build items
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

    // ✅ Lemon min price rule
    const MIN_MNT = 1780;
    const rawTotal = Number(order.totalPrice);
    const total = Math.max(MIN_MNT, Math.round(rawTotal || 0));

    console.log("🍋 LEMON checkout:", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      rawTotal: order.totalPrice,
      finalCustomPrice: total,
      variantId: String(variantId),
      test_mode: process.env.LEMON_TEST_MODE === "true",
    });

    // create LemonPayment record
    await prisma.lemonPayment.upsert({
      where: { orderId: order.id },
      update: {},
      create: { orderId: order.id, status: "PENDING" },
    });

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          // ✅ IMPORTANT: send custom_price as STRING
          custom_price: String(total),

          checkout_data: {
            email: order.user?.email || undefined,

            // ✅ Lemon requires custom values to be strings
            custom: {
              order_id: String(order.id),
              order_number: String(order.orderNumber || ""),
              total_price: String(total),
              currency: "MNT",

              items_summary: String(itemsSummary || ""),

              items: JSON.stringify(items),
              customer: JSON.stringify({
                firstName: order.firstName,
                lastName: order.lastName,
                phone: order.phone,
              }),
              delivery: JSON.stringify({
                city: order.city,
                district: order.district,
                khoroo: order.khoroo,
                address: order.address,
                notes: order.notes,
              }),
            },
          },

          product_options: {
            redirect_url:
              redirectUrl ||
              `${process.env.FRONTEND_URL}/profile/orders/${order.id}`,
          },

          // Lemon requires array
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

    // store checkoutId for fallback matching
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
