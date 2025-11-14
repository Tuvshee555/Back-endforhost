import { prisma } from "../../prismaClient.js";

export const addCart = async (req, res) => {
  const { userId, foodId, quantity, selectedSize } = req.body;

  try {
    const existing = await prisma.cartItem.findFirst({
      where: { userId, foodId, selectedSize },
    });

    if (existing) {
      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (quantity || 1) },
      });

      return res.json({ success: true, item: updated });
    }

    const created = await prisma.cartItem.create({
      data: {
        userId,
        foodId,
        quantity: quantity || 1,
        selectedSize,
      },
    });

    return res.json({ success: true, item: created });
  } catch (error) {
    console.error("Error adding cart:", error);
    return res.status(500).json({ success: false, message: "Failed to add cart item" });
  }
};
