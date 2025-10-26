import { prisma } from "../../prismaClient.js";

export const getFood = async (req, res) => {
  try {
    const foods = await prisma.food.findMany({
      include: {
        category: true, // Include category info if needed
      },
    });

    res.status(200).json(foods);
  } catch (err) {
    console.error("Error fetching foods:", err);
    res.status(500).json({ success: false, message: `Error while getting food: ${err.message}` });
  }
};
