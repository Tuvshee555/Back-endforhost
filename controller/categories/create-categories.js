import { prisma } from "../../prismaClient.js";

// CREATE CATEGORY
export const createCategories = async (req, res) => {
  const { categoryName } = req.body;
  if (!categoryName?.trim())
    return res.status(400).json({ success: false, message: "Empty name" });

  try {
    await prisma.category.create({ data: { categoryName: categoryName.trim() } });

    const categories = await prisma.category.findMany({ include: { foods: true } });

    const mappedCategories = categories.map(c => ({
      _id: c.id,
      categoryName: c.categoryName,
      foodCount: c.foods.length,
    }));

    res.status(200).json(mappedCategories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating category" });
  }
};

// GET CATEGORY
export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { foods: true } });

    const mappedCategories = categories.map(c => ({
      _id: c.id,
      categoryName: c.categoryName,
      foodCount: c.foods.length,
    }));

    res.status(200).json(mappedCategories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching categories" });
  }
};
