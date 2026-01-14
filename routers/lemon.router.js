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
      return res.status(400).json({ message: "orderId and variantId required" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id: orderId },
      include: {
        foodOrderItems: {
          include: { food: { select: { id: true, foodName: true, price: true } } },
        },
        user: { select: { email: true } },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // build items
    const items = (order.foodOrderItems || []).map((it) => ({
      foodId: it.food?.id,
      name: it.food?.foodName,
      qty: it.quantity,
      unitPrice: it.food?.price ?? 0,
      lineTotal: (it.food?.price ?? 0) * (it.quantity ?? 0),
    }));

    const itemsSummary = items
      .filter((x) => x.name && x.qty)
      .slice(0, 12)
      .map((x) => `${x.name} x${x.qty}`)
      .join(", ");

    // const total = Math.round(Number(order.totalPrice) || 0);

    // create LemonPayment record
    await prisma.lemonPayment.upsert({
      where: { orderId },
      update: {},
      create: { orderId, status: "PENDING" },
    });
const MIN_MNT = 1780;
const total = Math.max(MIN_MNT, Math.round(Number(order.totalPrice) || 0));

const payload = {
  data: {
    type: "checkouts",
    attributes: {
      custom_price: total,

      checkout_data: {
        email: order.user?.email || undefined,

        custom: {
          order_id: String(order.id),
          order_number: String(order.orderNumber || ""),
          total_price: String(total),
          currency: "MNT",

          items_summary: String(itemsSummary || ""),

          // ✅ custom fields MUST BE STRINGS in Lemon
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
          `${process.env.FRONTEND_URL}/profile/orders/${orderId}`,
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

    // store checkoutId for fallback matching
    await prisma.lemonPayment.update({
      where: { orderId },
      data: { checkoutId, status: "PENDING" },
    });

    return res.status(200).json({ checkoutUrl, checkoutId });
  } catch (err) {
  console.error("LEMON CHECKOUT ERROR STATUS:", err?.response?.status);
  console.error("LEMON CHECKOUT ERROR DATA:", err?.response?.data);
  return res.status(500).json({
    message: "Failed to create checkout",
    status: err?.response?.status,
    data: err?.response?.data,
  });
}

});

export default router;
