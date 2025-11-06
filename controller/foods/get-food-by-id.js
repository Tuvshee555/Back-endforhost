import { prisma } from "../../prismaClient.js";

export const getFoodById = async (req, res) => {
  try {
    const { id } = req.params;

    const food = await prisma.food.findUnique({
      where: { id },
    });

    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    res.json(food);
  } catch (error) {
    console.error("Error fetching food by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};
