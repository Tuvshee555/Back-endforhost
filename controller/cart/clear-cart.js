import { prisma } from "../../prismaClient.js";

export const clearCart = async (req, res) => {
  const { userId } = req.body;

  try {
    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
};
