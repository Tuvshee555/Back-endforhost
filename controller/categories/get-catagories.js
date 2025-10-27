import { prisma } from "../../prismaClient.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        foods: true, // Include related foods
      },
    });

    // Map to include food count
    const categoriesWithCount = categories.map(cat => ({
      id: cat.id,
      categoryName: cat.categoryName,
      foodCount: cat.foods.length,
    }));

    res.status(200).json(categoriesWithCount);
  } catch (err) {
    console.error("Error while getting categories:", err);
    res.status(500).send(`Error while getting categories: ${err.message}`);
  }
};
