// controller/orders/get-order-by-id.js
import { prisma } from "../../prismaClient.js";

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.foodOrder.findUnique({
      where: { id },
      include: {
        foodOrderItems: {
          include: { food: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phonenumber: true,
            city: true,
            district: true,
            khoroo: true,
            address: true,
            notes: true,
          },
        },
      },
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    // send location directly and include user details (so frontend has everything)
    const formatted = {
      id: order.id,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      status: order.status,
      location: order.location ?? "",
      user: order.user ?? null,
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
    };

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error getOrderById:", err);
    res.status(500).json({ error: "Failed to load order" });
  }
};
