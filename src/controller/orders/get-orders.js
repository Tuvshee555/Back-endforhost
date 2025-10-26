import { prisma } from "../../prismaClient.js";

export const getFoodOrder = async (req, res) => {
  const { id } = req.params; // Prisma uses `id` instead of `_id`

  if (!id) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  try {
    const foodOrders = await prisma.foodOrder.findMany({
      where: { userId: id },
      include: {
        foodOrderItems: {
          include: {
            food: true, // include the related food details
          },
        },
      },
    });

    if (!foodOrders || foodOrders.length === 0) {
      return res.status(404).json({ success: false, message: "No food orders found for this user" });
    }

    res.status(200).json(foodOrders);
  } catch (error) {
    console.error("Error while getting food orders:", error);
    res.status(500).json({ success: false, message: `Error while getting food orders: ${error.message}` });
  }
};
