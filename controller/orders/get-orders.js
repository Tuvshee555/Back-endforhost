import { prisma } from "../../prismaClient.js";

export const getFoodOrder = async (req, res) => {
  const { userId } = req.params;

  if (!userId) return res.status(400).json({ message: "User ID is required" });

  const foodOrders = await prisma.foodOrder.findMany({
    where: { userId },
    include: { foodOrderItems: { include: { food: true } } },
  });

  res.status(200).json(foodOrders);
};


