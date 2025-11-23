import { prisma } from "../../prismaClient.js";

export const syncCart = async (req, res) => {
  const { userId, items } = req.body;

  if (!userId || !items) {
    return res.status(400).json({
      success: false,
      message: "userId and items are required",
    });
  }

  try {
    for (const item of items) {
      const { foodId, quantity, selectedSize } = item;

      if (!foodId) continue;

      // Check if item already exists in server cart
      const existing = await prisma.cartItem.findFirst({
        where: { userId, foodId, selectedSize: selectedSize || null },
      });

      if (existing) {
        // Increase quantity
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + (quantity || 1) },
        });
      } else {
        // Create new item
        await prisma.cartItem.create({
          data: {
            userId,
            foodId,
            selectedSize: selectedSize || null,
            quantity: quantity || 1,
          },
        });
      }
    }

    // Return updated server cart
    const mergedCart = await prisma.cartItem.findMany({
      where: { userId },
      include: { food: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, items: mergedCart });
  } catch (error) {
    console.error("Cart sync error:", error);
    return res.status(500).json({ success: false, message: "Failed to sync cart" });
  }
};
