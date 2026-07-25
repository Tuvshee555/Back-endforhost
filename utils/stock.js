import { prisma } from "../prismaClient.js";

// Inventory helpers for size-level stock (FoodSize.stock).
//
// Model: stock is RESERVED when an order is placed and RESTOCKED if the order
// is later cancelled / expired / refunded. A size with stock === null is
// treated as unlimited and is never tracked, so this whole feature stays a
// no-op until an admin actually sets a stock number on a size.

/**
 * Decrement stock for each ordered item that maps to a stock-tracked size.
 * MUST run inside the order-creation transaction (receives the `tx` client)
 * so a shortfall rolls the whole order back — no partial reservations.
 *
 * Throws an error with `.code === "OUT_OF_STOCK"` if any item can't be filled.
 */
export async function applyStockDecrements(tx, items) {
  for (const item of items) {
    if (!item.size) continue; // no size chosen → not a tracked variant

    const sizeRow = await tx.foodSize.findFirst({
      where: { foodId: item.foodId, label: item.size },
      select: { id: true, stock: true },
    });

    // Unknown size, or unlimited (stock null) → nothing to reserve.
    if (!sizeRow || sizeRow.stock == null) continue;

    // Atomic compare-and-decrement: only succeeds if enough stock remains,
    // which prevents two concurrent orders from overselling the same size.
    const result = await tx.foodSize.updateMany({
      where: { id: sizeRow.id, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });

    if (result.count !== 1) {
      const err = new Error("OUT_OF_STOCK");
      err.code = "OUT_OF_STOCK";
      err.size = item.size;
      err.foodId = item.foodId;
      throw err;
    }
  }
}

/**
 * Give reserved stock back for an order's items. Best-effort: it never throws,
 * so a cancellation/expiry is never blocked by a restock hiccup. Only touches
 * sizes that still track stock (null stock stays unlimited).
 */
export async function restockOrder(orderId) {
  try {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { foodId: true, quantity: true, size: true },
    });

    for (const item of items) {
      if (!item.size) continue;

      const sizeRow = await prisma.foodSize.findFirst({
        where: { foodId: item.foodId, label: item.size },
        select: { id: true, stock: true },
      });

      if (!sizeRow || sizeRow.stock == null) continue;

      await prisma.foodSize.update({
        where: { id: sizeRow.id },
        data: { stock: { increment: item.quantity } },
      });
    }
  } catch (err) {
    console.error("restockOrder failed:", err?.message || err);
  }
}
