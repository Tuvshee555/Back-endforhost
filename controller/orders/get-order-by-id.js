// controller/orders/get-order-by-id.js
import { prisma } from "../../prismaClient.js";

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id },
      include: {
        foodOrderItems: {
          include: {
            food: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      id: order.id,
      orderNumber: order.orderNumber,          // ✅ ADDED
      status: order.status,
      paymentMethod: order.paymentMethod,      // ✅ ADDED
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      delivery: {
        firstName: order.firstName,
        lastName: order.lastName,
        phone: order.phone,
        city: order.city,
        district: order.district,
        khoroo: order.khoroo,
        address: order.address,
        notes: order.notes,
      },

      items: order.foodOrderItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        food: {
          id: item.food.id,
          foodName: item.food.foodName,
          price: item.food.price,
          image: item.food.image,
        },
      })),
    });
  } catch (error) {
    console.error("GET ORDER BY ID ERROR:", error);
    return res.status(500).json({ message: "Failed to load order" });
  }
};
