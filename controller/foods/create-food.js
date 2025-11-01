import { prisma } from "../../prismaClient.js";

export const createFood = async (req, res) => {
  const { foodName, price, image, ingredients, categoryId } = req.body;

  if (!categoryId) {
    return res
      .status(400)
      .json({ success: false, message: "Category is required" });
  }

  try {
    const newFood = await prisma.food.create({
      data: {
        foodName,
        price: parseFloat(price),
        image,
        ingredients,
        categoryId,
      },
    });

    const foods = await prisma.food.findMany({ include: { category: true } });
    const mappedFoods = foods.map((f) => ({
      _id: f.id,
      foodName: f.foodName,
      price: f.price,
      image: f.image,
      ingredients: f.ingredients,
      category: f.category
        ? { id: f.category.id, categoryName: f.category.categoryName }
        : null,
    }));

    res.status(200).json(mappedFoods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating food" });
  }
};
