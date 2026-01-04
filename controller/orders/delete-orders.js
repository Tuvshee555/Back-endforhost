// controller/orders/delete-orders.js
import { prisma } from "../../prismaClient.js";

export const deleteFoodOrder = async (req, res) => {
  const { id } = req.body; // current route uses body; consider switching to DELETE /:id

  if (!id) {
    return res.status(400).json({ success: false, message: "Order ID is required" });
  }

  try {
    // Delete order items first, then order in a transaction
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.foodOrder.delete({ where: { id } }),
    ]);

    return res.status(200).json({ success: true, message: "Successfully deleted food order" });
  } catch (error) {
    console.error("Error deleting food order:", error);
    return res.status(500).json({ success: false, message: "Error deleting food order" });
  }
};
