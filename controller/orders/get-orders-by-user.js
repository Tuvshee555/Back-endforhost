// controller/orders/get-orders-by-user.js
import { prisma } from "../../prismaClient.js";

export const getOrdersByUser = async (req, res) => {
  const { userId } = req.params;

  if (!userId)
    return res.status(400).json({ message: "User ID is required" });

  const orders = await prisma.foodOrder.findMany({
    where: { userId },
    include: { foodOrderItems: { include: { food: true } } },
  });

  res.status(200).json({ success: true, orders });
};
