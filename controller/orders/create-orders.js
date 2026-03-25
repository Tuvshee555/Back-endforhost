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

    if (!paymentMethod || !["COD", "BANK", "QPAY", "LEMON"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    const safe = (v) =>
      typeof v === "string" && v.trim().length ? v.trim() : null;

    const normalizedItems = items
      .map((i) => ({
        foodId: typeof i.foodId === "string" ? i.foodId : null,
        quantity: Number.parseInt(i.quantity, 10) || 0,
      }))
      .filter((i) => i.foodId && i.quantity > 0);

    if (!normalizedItems.length) {
      return res.status(400).json({ message: "No valid items" });
    }

    const foodIds = [...new Set(normalizedItems.map((i) => i.foodId))];
    const foods = await prisma.food.findMany({
      where: { id: { in: foodIds } },
      select: { id: true, price: true },
    });

    if (foods.length !== foodIds.length) {
      return res.status(400).json({ message: "Some foods no longer exist" });
    }

    const foodPriceMap = new Map(
      foods.map((food) => [food.id, Number(food.price ?? 0)])
    );

    const computedTotalPrice = Number(
      normalizedItems
        .reduce(
          (sum, item) =>
            sum + (foodPriceMap.get(item.foodId) ?? 0) * item.quantity,
          0
        )
        .toFixed(2)
    );

    if (computedTotalPrice <= 0) {
      return res.status(400).json({ message: "Order total must be greater than zero" });
    }

    const requestedTotalPrice = Number(totalPrice);
    if (
      typeof totalPrice !== "undefined" &&
      totalPrice !== null &&
      totalPrice !== "" &&
      Number.isFinite(requestedTotalPrice) &&
      Math.abs(requestedTotalPrice - computedTotalPrice) > 0.01
    ) {
      console.warn("CREATE ORDER WARNING: client/server total mismatch", {
        userId,
        requestedTotalPrice,
        computedTotalPrice,
      });
    }

    const status =
      paymentMethod === "COD" ? "COD_PENDING" : "WAITING_PAYMENT";

    const orderNumber = generateOrderNumber();

    const order = await prisma.foodOrder.create({
      data: {
        userId,
        orderNumber,
        totalPrice: computedTotalPrice,
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
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        totalPrice: true,
        userId: true,
      },
    });

    res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalPrice: order.totalPrice,
    });

    setImmediate(async () => {
      try {
        const fullOrder = await prisma.foodOrder.findUnique({
          where: { id: order.id },
          include: {
            user: { select: { email: true } },
            foodOrderItems: {
              include: { food: true },
            },
          },
        });

        if (!fullOrder) return;

        sendTelegramMessage(formatOrderMessage(fullOrder)).catch(() => {});

        const customerEmail = fullOrder.user?.email;
        if (customerEmail) {
          sendEmail({
            to: customerEmail,
            subject: `âœ… Ð—Ð°Ñ…Ð¸Ð°Ð»Ð³Ð° Ñ…Ò¯Ð»ÑÑÐ½ Ð°Ð²Ð»Ð°Ð° #${fullOrder.orderNumber}`,
            html: orderCreatedEmail(fullOrder),
          }).catch(() => {});
        }
      } catch (bgErr) {
        console.error("âŒ Background notify failed:", bgErr);
      }
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({ message: "Order creation failed" });
  }
};
