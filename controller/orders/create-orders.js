// controller/orders/create-orders.js
import { prisma } from "../../prismaClient.js";
import { generateOrderNumber } from "../../utils/generateOrderNumber.js";

import { sendTelegramMessage, formatOrderMessage } from "../../utils/telegram.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { orderCreatedEmail } from "../../utils/emailTemplates.js";
import { applyStockDecrements } from "../../utils/stock.js";

// Delivery fee is the server-side source of truth (must match the customer UI).
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE) || 9000;
const DELIVERY_ZONES = new Set(["UB", "RURAL"]);

export const createFoodOrder = async (req, res) => {
  try {
    const userId = req.user?.id;

    const {
      totalPrice,
      paymentMethod,
      deliveryZone,
      idempotencyKey,
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

    // Shape the client-facing order response in one place so the idempotent
    // replay path and the freshly-created path return the exact same thing.
    const toOrderResponse = (o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      totalPrice: o.totalPrice,
      deliveryFee: o.deliveryFee,
      deliveryZone: o.deliveryZone,
    });

    const safeKey =
      typeof idempotencyKey === "string" && idempotencyKey.trim().length
        ? idempotencyKey.trim().slice(0, 100)
        : null;

    // Idempotency: if this key already produced an order for this user, return
    // it instead of creating a duplicate (double-click / retry / flaky network).
    if (safeKey) {
      const existing = await prisma.foodOrder.findUnique({
        where: { idempotencyKey: safeKey },
        select: {
          id: true,
          userId: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          totalPrice: true,
          deliveryFee: true,
          deliveryZone: true,
        },
      });
      if (existing && existing.userId === userId) {
        return res.status(200).json(toOrderResponse(existing));
      }
    }

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
        size:
          typeof (i.size ?? i.selectedSize) === "string" &&
          (i.size ?? i.selectedSize).trim().length
            ? (i.size ?? i.selectedSize).trim().slice(0, 60)
            : null,
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

    const itemsSubtotal = Number(
      normalizedItems
        .reduce(
          (sum, item) =>
            sum + (foodPriceMap.get(item.foodId) ?? 0) * item.quantity,
          0
        )
        .toFixed(2)
    );

    if (itemsSubtotal <= 0) {
      return res.status(400).json({ message: "Order total must be greater than zero" });
    }

    // Normalize the delivery zone and derive the fee server-side.
    const normalizedZone = DELIVERY_ZONES.has(deliveryZone) ? deliveryZone : "UB";
    const deliveryFee = DELIVERY_FEE;

    // Grand total the customer is actually charged (items + delivery).
    const computedTotalPrice = Number((itemsSubtotal + deliveryFee).toFixed(2));

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

    const orderSelect = {
      id: true,
      orderNumber: true,
      status: true,
      paymentMethod: true,
      totalPrice: true,
      deliveryFee: true,
      deliveryZone: true,
      userId: true,
    };

    let order;
    try {
      // Reserve stock and create the order atomically: if any tracked size is
      // short, the whole thing rolls back and no order (or reservation) sticks.
      order = await prisma.$transaction(async (tx) => {
        await applyStockDecrements(tx, normalizedItems);

        return tx.foodOrder.create({
          data: {
            userId,
            orderNumber,
            idempotencyKey: safeKey,
            totalPrice: computedTotalPrice,
            deliveryFee,
            deliveryZone: normalizedZone,
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
          select: orderSelect,
        });
      });
    } catch (createErr) {
      // Not enough stock for a chosen size.
      if (createErr?.code === "OUT_OF_STOCK") {
        return res.status(409).json({
          message: "Sorry, an item just went out of stock. Please adjust your cart.",
          size: createErr.size,
          foodId: createErr.foodId,
        });
      }

      // Unique idempotency-key race: a concurrent request already created it.
      if (createErr?.code === "P2002" && safeKey) {
        const existing = await prisma.foodOrder.findUnique({
          where: { idempotencyKey: safeKey },
          select: orderSelect,
        });
        if (existing && existing.userId === userId) {
          return res.status(200).json(toOrderResponse(existing));
        }
      }
      throw createErr;
    }

    res.status(201).json(toOrderResponse(order));

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
