import { prisma } from "../../prismaClient.js";

export const updateCart = async (req, res) => {
  const { id, quantity } = req.body;

  try {
    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });

    return res.json({ success: true, item: updated });
  } catch (error) {
    console.error("Update cart error:", error);
    return res.status(500).json({ success: false, message: "Failed to update cart item" });
  }
};
