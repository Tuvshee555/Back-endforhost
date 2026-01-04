// controller/orders/get-orders-by-user.js
import { prisma } from "../../prismaClient.js";

export const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const orders = await prisma.foodOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }, // newest first
      include: {
        foodOrderItems: {
          include: {
            food: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("GET ORDERS BY USER ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};
