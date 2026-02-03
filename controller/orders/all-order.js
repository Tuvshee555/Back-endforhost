// controller/orders/all-order.js
import { prisma } from "../../prismaClient.js";

export const getAllOrder = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    const orders = await prisma.foodOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            address: true,
          },
        },

        foodOrderItems: {
          include: {
            food: {
              select: {
                id: true,
                foodName: true,
                image: true,
                price: true,
                categoryId: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(
      orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,

        // delivery info
        firstName: order.firstName,
        lastName: order.lastName,
        phone: order.phone,
        city: order.city,
        district: order.district,
        khoroo: order.khoroo,
        address: order.address,
        notes: order.notes,

        user: order.user
          ? {
              id: order.user.id,
              email: order.user.email,
              address: order.user.address,
            }
          : null,

        foodOrderItems: order.foodOrderItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          food: item.food
            ? {
                id: item.food.id,
                foodName: item.food.foodName,
                image: item.food.image,
                price: item.food.price,
                categoryId: item.food.categoryId,
              }
            : null,
        })),

        itemsCount: order.foodOrderItems.length,
      }))
    );
  } catch (error) {
    console.error("GET ALL ORDERS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};
