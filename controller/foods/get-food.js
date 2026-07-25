import { prisma } from "../../prismaClient.js";
import { cached } from "../../utils/cache.js";

export const getFood = async (req, res) => {
  try {
    const foods = await cached("foods:all", 20_000, () =>
      prisma.food.findMany({
        include: {
          category: true,
          sizes: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    );

    return res.status(200).json(foods);
  } catch (err) {
    console.error("Error fetching foods:", err);
    return res
      .status(500)
      .json({ message: "Error while getting foods" });
  }
};
