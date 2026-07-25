import { prisma } from "../prismaClient.js";

/**
 * Increment salesCount for every item in an order.
 *
 * MUST be called exactly once, at the moment an order first transitions to
 * PAID. All callers guard on the previous status (skip if already PAID) so a
 * duplicate webhook / re-check never double-counts.
 */
export async function incrementSalesForOrder(orderId) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { foodId: true, quantity: true },
  });

  if (!items.length) return;

  await prisma.$transaction(
    items.map((it) =>
      prisma.food.update({
        where: { id: it.foodId },
        data: { salesCount: { increment: it.quantity } },
      })
    )
  );
}
