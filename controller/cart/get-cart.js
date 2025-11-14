import { prisma } from "../../prismaClient.js";

export const getCart = async (req, res) => {
  const { userId } = req.params;

  try {
    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        food: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, items });
  } catch (error) {
    console.error("Error getting cart:", error);
    return res.status(500).json({ success: false, message: "Failed to load cart" });
  }
};
