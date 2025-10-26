import { prisma } from "../../prismaClient.js";

export const createFoodOrder = async (req, res) => {
  const { totalPrice, userId, items } = req.body; // items = [{ foodId, quantity }, ...]

  try {
    // Create FoodOrder along with related OrderItems in a transaction
    const newOrder = await prisma.foodOrder.create({
      data: {
        userId,
        totalPrice,
        foodOrderItems: {
          create: items.map(item => ({
            foodId: item.foodId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        user: true,
        foodOrderItems: {
          include: {
            food: true,
          },
        },
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
