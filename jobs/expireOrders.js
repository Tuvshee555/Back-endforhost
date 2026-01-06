import { prisma } from "../prismaClient.js";

const EXPIRE_AFTER_MINUTES = 15;

export async function expireUnpaidOrders() {
  try {
    const cutoff = new Date(
      Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000
    );

    const result = await prisma.foodOrder.updateMany({
      where: {
        status: "WAITING_PAYMENT",
        createdAt: { lt: cutoff },
      },
      data: { status: "CANCELLED" },
    });

    if (result.count > 0) {
      console.log(
        `⏳ Expired ${result.count} unpaid orders (>15 min)`
      );
    }
  } catch (err) {
    console.error("❌ Expire job failed:", err.message);
  }
}
