import { prisma } from "../../prismaClient.js";

export const deleteFoodOrder = async (req, res) => {
  const { id } = req.body; // Prisma uses `id` instead of `_id`

  if (!id) {
    return res.status(400).json({ success: false, message: "Order ID is required" });
  }

  try {
    // Delete the order and all related order items in a transaction
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.foodOrder.delete({ where: { id } }),
    ]);

    res.status(200).json({ success: true, message: "Successfully deleted food order" });
  } catch (error) {
    console.error("Error deleting food order:", error);
    res.status(500).json({ success: false, message: "Error deleting food order" });
  }
};
