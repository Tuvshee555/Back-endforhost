// controller/orders/update-orders.js
import { prisma } from "../../prismaClient.js";

export const updatedFoodOrder = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: "Order ID required" });

  // Accept status and any delivery fields (only update provided keys)
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

  const data = {};
  if (status) data.status = status;
  if (typeof firstName !== "undefined") data.firstName = firstName;
  if (typeof lastName !== "undefined") data.lastName = lastName;
  if (typeof phone !== "undefined") data.phone = phone;
  if (typeof city !== "undefined") data.city = city;
  if (typeof district !== "undefined") data.district = district;
  if (typeof khoroo !== "undefined") data.khoroo = khoroo;
  if (typeof address !== "undefined") data.address = address;
  if (typeof notes !== "undefined") data.notes = notes;

  try {
    const updatedOrder = await prisma.foodOrder.update({
      where: { id },
      data,
      include: {
        foodOrderItems: { include: { food: true } },
      },
    });

    // Return structured shape similar to getOrderById
    const formatted = {
      id: updatedOrder.id,
      status: updatedOrder.status,
      totalPrice: updatedOrder.totalPrice,
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
      delivery: {
        firstName: updatedOrder.firstName,
        lastName: updatedOrder.lastName,
        phone: updatedOrder.phone,
        city: updatedOrder.city,
        district: updatedOrder.district,
        khoroo: updatedOrder.khoroo,
        address: updatedOrder.address,
        notes: updatedOrder.notes,
      },
      items: updatedOrder.foodOrderItems.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        food: {
          id: it.food.id,
          foodName: it.food.foodName,
          price: it.food.price,
          image: it.food.image,
        },
      })),
    };

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error while updating food order:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    return res.status(500).json({ success: false, message: "Error while updating food order" });
  }
};
