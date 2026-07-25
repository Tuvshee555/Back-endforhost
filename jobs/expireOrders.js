import { prisma } from "../prismaClient.js";
import { restockOrder } from "../utils/stock.js";

const EXPIRE_AFTER_MINUTES = 15;

export async function expireUnpaidOrders() {
  try {
    const cutoff = new Date(
      Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000
    );

    // Find the orders first so we can release the stock they reserved.
    const expiring = await prisma.foodOrder.findMany({
      where: {
        status: "WAITING_PAYMENT",
        createdAt: { lt: cutoff },
      },
      select: { id: true },
    });

    if (expiring.length === 0) return;

    const ids = expiring.map((o) => o.id);

    const result = await prisma.foodOrder.updateMany({
      where: { id: { in: ids } },
      data: { status: "CANCELLED" },
    });

    // Best-effort restock for each expired order.
    for (const id of ids) {
      await restockOrder(id);
    }

    if (result.count > 0) {
      console.log(
        `⏳ Expired ${result.count} unpaid orders (>15 min) and released their stock`
      );
    }
  } catch (err) {
    console.error("❌ Expire job failed:", err.message);
  }
}
