// controller/orders/delete-orders.js
import { prisma } from "../../prismaClient.js";
import { restockOrder } from "../../utils/stock.js";

export const deleteFoodOrder = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    // 🔒 ADMIN ONLY
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🔒 NEVER DELETE IMPORTANT ORDERS
    if (["PAID", "DELIVERING", "DELIVERED"].includes(order.status)) {
      return res.status(400).json({
        message: "Cannot delete paid or delivered orders. Cancel instead.",
      });
    }

    // Release reserved stock — but only if it wasn't already released when the
    // order was cancelled (avoids double-restocking a CANCELLED order).
    if (order.status !== "CANCELLED") {
      await restockOrder(id);
    }

    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.foodOrder.delete({ where: { id } }),
    ]);

    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("DELETE ORDER ERROR:", error);
    return res.status(500).json({ message: "Failed to delete order" });
  }
};
