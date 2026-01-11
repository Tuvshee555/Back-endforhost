// controller/orders/update-orders.js
import { prisma } from "../../prismaClient.js";
import {
  sendTelegramMessage,
  formatOrderStatusMessage,
} from "../../utils/telegram.js";

const ALLOWED_TRANSITIONS = {
  PENDING: ["WAITING_PAYMENT", "COD_PENDING", "CANCELLED"],
  WAITING_PAYMENT: ["PAID", "CANCELLED"],
  COD_PENDING: ["DELIVERING", "CANCELLED"],
  PAID: ["DELIVERING"],
  DELIVERING: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const updatedFoodOrder = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: "Order ID required" });
  }

  const {
    status,
    firstName,
    lastName,
    phone,
    city,
    district,
    khoroo,
    address,
    notes,
  } = req.body;

  try {
    const existing = await prisma.foodOrder.findUnique({
      where: { id },
      include: {
        foodOrderItems: { include: { food: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🔒 STATUS TRANSITION GUARD
    if (status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Invalid status transition: ${existing.status} → ${status}`,
        });
      }
    }

    const safe = (v) =>
      typeof v === "string" && v.trim().length ? v.trim() : null;

    const data = {};
    if (status) data.status = status;
    if (firstName !== undefined) data.firstName = safe(firstName);
    if (lastName !== undefined) data.lastName = safe(lastName);
    if (phone !== undefined) data.phone = safe(phone);
    if (city !== undefined) data.city = safe(city);
    if (district !== undefined) data.district = safe(district);
    if (khoroo !== undefined) data.khoroo = safe(khoroo);
    if (address !== undefined) data.address = safe(address);
    if (notes !== undefined) data.notes = safe(notes);

    const updated = await prisma.foodOrder.update({
      where: { id },
      data,
      include: {
        foodOrderItems: { include: { food: true } },
      },
    });

    // ✅ TELEGRAM STATUS NOTIFY (smart, no spam)
    const oldStatus = existing.status;
    const newStatus = updated.status;

    const IMPORTANT = new Set(["PAID", "CANCELLED", "DELIVERED", "DELIVERING"]);

    if (status && oldStatus !== newStatus && IMPORTANT.has(newStatus)) {
      sendTelegramMessage(
        formatOrderStatusMessage(updated, oldStatus, newStatus)
      );
    }

    return res.status(200).json({
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      paymentMethod: updated.paymentMethod,
      totalPrice: updated.totalPrice,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      delivery: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        city: updated.city,
        district: updated.district,
        khoroo: updated.khoroo,
        address: updated.address,
        notes: updated.notes,
      },
      items: updated.foodOrderItems.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        food: {
          id: it.food.id,
          foodName: it.food.foodName,
          price: it.food.price,
          image: it.food.image,
        },
      })),
    });
  } catch (error) {
    console.error("UPDATE ORDER ERROR:", error);
    return res.status(500).json({ message: "Failed to update order" });
  }
};
