// controller/orders/get-orders-by-user.js
import { prisma } from "../../prismaClient.js";

export const getOrdersByUser = async (req, res) => {
  try {
    const authUserId = req.user?.id;

    if (!authUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orders = await prisma.foodOrder.findMany({
      where: { userId: authUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        totalPrice: true,
        createdAt: true,
        updatedAt: true,

        // 🔥 DELIVERY INFO
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        district: true,
        khoroo: true,
        address: true,
        notes: true,
      },
    });

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("GET ORDERS BY USER ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};
