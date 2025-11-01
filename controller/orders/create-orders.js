import { prisma } from "../../prismaClient.js";

export const createFoodOrder = async (req, res) => {
  const { totalPrice, userId, items, location } = req.body;

  if (!location) {
    return res.status(400).json({ success: false, message: "Location is required" });
  }

  try {
    const newOrder = await prisma.foodOrder.create({
      data: {
        userId,
        totalPrice,
        location, // must match the column name in your Prisma schema
        foodOrderItems: {
          create: items.map(item => ({
            foodId: item.foodId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        user: true,
        foodOrderItems: { include: { food: true } },
      },
    });

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error creating FoodOrder:", error);
    res.status(500).json({
      success: false,
      message: "Error creating FoodOrder",
      error: error.message,
    });
  }
};
