// controller/orders/create-orders.js
import { prisma } from "../../prismaClient.js";
import { generateOrderNumber } from "../../utils/generateOrderNumber.js";
import { sendTelegramMessage, formatOrderMessage } from "../../utils/telegram.js";

import { sendEmail } from "../../utils/sendEmail.js";
import { orderCreatedEmail } from "../../utils/emailTemplates.js";

export const createFoodOrder = async (req, res) => {
  try {
    const userId = req.user?.id;

    const {
      totalPrice,
      paymentMethod,
      firstName,
      lastName,
      phone,
      city,
      district,
      khoroo,
      address,
      notes,
    } = req.body;

    const items = req.body.items ?? req.body.normalizedItems;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!paymentMethod || !["COD", "BANK", "QPAY"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    if (typeof totalPrice === "undefined" || Number.isNaN(Number(totalPrice))) {
      return res.status(400).json({ message: "Invalid total price" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    const safe = (v) =>
      typeof v === "string" && v.trim().length ? v.trim() : null;

    const normalizedItems = items
      .map((i) => ({
        foodId: typeof i.foodId === "string" ? i.foodId : null,
        quantity: Number(i.quantity) || 0,
      }))
      .filter((i) => i.foodId && i.quantity > 0);

    if (!normalizedItems.length) {
      return res.status(400).json({ message: "No valid items" });
    }

    const foodIds = [...new Set(normalizedItems.map((i) => i.foodId))];
    const foods = await prisma.food.findMany({
      where: { id: { in: foodIds } },
      select: { id: true },
    });

    if (foods.length !== foodIds.length) {
      return res.status(400).json({ message: "Some foods no longer exist" });
    }

    const status = paymentMethod === "COD" ? "COD_PENDING" : "WAITING_PAYMENT";
    const orderNumber = generateOrderNumber();

    const order = await prisma.foodOrder.create({
      data: {
        userId,
        orderNumber,
        totalPrice: Number(totalPrice),
        paymentMethod,
        status,

        firstName: safe(firstName),
        lastName: safe(lastName),
        phone: safe(phone),
        city: safe(city),
        district: safe(district),
        khoroo: safe(khoroo),
        address: safe(address),
        notes: safe(notes),

        foodOrderItems: {
          create: normalizedItems,
        },
      },
      include: {
        foodOrderItems: { include: { food: true } },
      },
    });

    // ✅ ADMIN TELEGRAM
    try {
      await sendTelegramMessage(formatOrderMessage(order));
    } catch (tgErr) {
      console.error("❌ Telegram order notify failed:", tgErr);
    }

    // ✅ CUSTOMER EMAIL
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `Order received #${order.orderNumber}`,
          html: orderCreatedEmail(order),
        });
      }
    } catch (mailErr) {
      console.error("❌ Customer email failed:", mailErr);
    }

    return res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalPrice: order.totalPrice,
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({ message: "Order creation failed" });
  }
};
