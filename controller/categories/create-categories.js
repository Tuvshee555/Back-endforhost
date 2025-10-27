import { prisma } from "../../prismaClient.js";

export const createCategories = async (req, res) => {
  const { categoryName } = req.body;

  if (!categoryName || !categoryName.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Category name is empty!" });
  }

  try {
    // Create new category
    await prisma.category.create({
      data: {
        categoryName: categoryName.trim(),
      },
    });

    // Fetch all categories
    const allCategories = await prisma.category.findMany();

    res.status(200).json(allCategories);
  } catch (error) {
    console.error("Error creating category:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating category", error: error.message });
  }
};
