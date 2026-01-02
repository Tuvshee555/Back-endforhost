import { prisma } from "../../prismaClient.js";

export const createFoodOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { totalPrice, items, location } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!location || !totalPrice) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    const order = await prisma.foodOrder.create({
      data: {
        userId,
        totalPrice,
        location,
        foodOrderItems: {
          create: items.map((item) => ({
            foodId: item.foodId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        foodOrderItems: true,
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    res.status(500).json({ message: "Order creation failed" });
  }
};
