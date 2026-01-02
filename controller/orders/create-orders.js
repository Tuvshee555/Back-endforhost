import { prisma } from "../../prismaClient.js";

export const createFoodOrder = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ guaranteed
    const { totalPrice, items, location } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!location) {
      return res.status(400).json({
        success: false,
        message: "Location is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    // 🔐 userId is trusted because it came from JWT
    const newOrder = await prisma.foodOrder.create({
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
        user: true,
        foodOrderItems: {
          include: { food: true },
        },
      },
    });

    return res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error creating FoodOrder:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating FoodOrder",
    });
  }
};
