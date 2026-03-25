import { prisma } from "../../prismaClient.js";

export const getFood = async (req, res) => {
  try {
    const foods = await prisma.food.findMany({
      include: {
        category: true,
        sizes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(foods);
  } catch (err) {
    console.error("Error fetching foods:", err);
    return res
      .status(500)
      .json({ message: "Error while getting foods" });
  }
};
