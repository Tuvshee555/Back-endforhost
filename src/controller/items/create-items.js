import { prisma } from "../../prismaClient.js";

export const createItems = async (req, res) => {
  const { foodId, orderId, quantity } = req.body;

  if (!foodId || !orderId || !quantity) {
    return res
      .status(400)
      .json({ success: false, message: "foodId, orderId, and quantity are required" });
  }

  try {
    const item = await prisma.orderItem.create({
      data: {
        foodId,
        orderId,
        quantity,
      },
    });

    const allItems = await prisma.orderItem.findMany();

    res.status(200).json({ success: true, item, allItems });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ success: false, message: "Error creating item", error: error.message });
  }
};
