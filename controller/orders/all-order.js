// controller/orders/all-order.js
import { prisma } from "../../prismaClient.js";

export const getAllOrder = async (req, res) => {
  try {
    const orders = await prisma.foodOrder.findMany({
      include: {
        user: {
          select: { id: true, email: true }, // minimal user info
        },
        foodOrderItems: {
          include: {
            food: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Return frontend-friendly structured array
    const formatted = orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user ? { id: order.user.id, email: order.user.email } : null,
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
      items: order.foodOrderItems.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        food: {
          id: it.food.id,
          foodName: it.food.foodName,
          price: it.food.price,
          image: it.food.image,
        },
      })),
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error while getting food orders:", error);
    return res.status(500).json({ message: `Error while getting food orders: ${error.message}` });
  }
};
