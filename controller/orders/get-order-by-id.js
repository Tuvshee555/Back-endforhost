import { prisma } from "../../prismaClient.js";

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.foodOrder.findUnique({
      where: { id },
      include: {
        foodOrderItems: {
          include: {
            food: true, // VERY IMPORTANT🔥
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Convert to frontend-friendly format
    const formatted = {
      id: order.id,
      totalPrice: order.totalPrice,
      deliveryFee: order.deliveryFee,
      productTotal: order.productTotal,
      createdAt: order.createdAt,
      items: order.foodOrderItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        food: {
          foodName: item.food.foodName,
          price: item.food.price,
          image: item.food.image,
        },
      })),
    };

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error getOrderById:", err.message);
    res.status(500).json({ error: "Failed to load order" });
  }
};
