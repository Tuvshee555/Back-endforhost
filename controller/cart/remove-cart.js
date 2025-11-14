import { prisma } from "../../prismaClient.js";

export const removeCart = async (req, res) => {
  const { id } = req.body;

  try {
    await prisma.cartItem.delete({ where: { id } });

    return res.json({ success: true });
  } catch (error) {
    console.error("Remove cart error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove item" });
  }
};
