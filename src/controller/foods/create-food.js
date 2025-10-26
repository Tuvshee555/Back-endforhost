import { prisma } from "../../prismaClient.js";

export const createFood = async (req, res) => {
  const { foodName, price, image, ingredients, categoryId } = req.body;

  try {
    // Create food using Prisma
    const newFood = await prisma.food.create({
      data: {
        foodName,
        price: parseFloat(price),
        image,
        ingredients,
        categoryId: categoryId || null, // optional
      },
    });

    // Get all foods after insertion
    const allFoods = await prisma.food.findMany({
      include: { category: true }, // optional: include category info
    });

    res.status(200).json(allFoods);
  } catch (error) {
    console.error("Error creating food:", error);
    res.status(500).json({ success: false, message: "Error creating food" });
  }
};
