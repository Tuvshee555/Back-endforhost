import { prisma } from "../../prismaClient.js";

// CREATE FOOD
export const createFood = async (req, res) => {
  const { foodName, price, image, ingredients, categoryId } = req.body;

  try {
    const newFood = await prisma.food.create({
      data: {
        foodName,
        price: parseFloat(price),
        image,
        ingredients,
        categoryId: categoryId,
      },
    });

    // Map response for frontend
    const foods = await prisma.food.findMany({
      include: { category: true },
    });

    const mappedFoods = foods.map(f => ({
      _id: f.id,
      foodName: f.foodName,
      price: f.price,
      image: f.image,
      ingredients: f.ingredients,
      category: f.category ? f.category.id : "",
    }));

    res.status(200).json(mappedFoods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating food" });
  }
};

// GET FOOD
export const getFood = async (req, res) => {
  try {
    const foods = await prisma.food.findMany({ include: { category: true } });

    const mappedFoods = foods.map(f => ({
      _id: f.id,
      foodName: f.foodName,
      price: f.price,
      image: f.image,
      ingredients: f.ingredients,
      category: f.category ? f.category.id : "",
    }));

    res.status(200).json(mappedFoods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching foods" });
  }
};

// UPDATE FOOD
export const updateFood = async (req, res) => {
  const { _id, foodName, price, image, ingredients, category } = req.body;

  try {
    await prisma.food.update({
      where: { id: _id },
      data: {
        foodName,
        price: parseFloat(price),
        image,
        ingredients,
        categoryId: category,
      },
    });

    const foods = await prisma.food.findMany({ include: { category: true } });
    const mappedFoods = foods.map(f => ({
      _id: f.id,
      foodName: f.foodName,
      price: f.price,
      image: f.image,
      ingredients: f.ingredients,
      category: f.category ? f.category.id : "",
    }));

    res.status(200).json(mappedFoods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating food" });
  }
};

// DELETE FOOD
export const deleteFood = async (req, res) => {
  const { _id } = req.params;

  try {
    await prisma.food.delete({ where: { id: _id } });

    const foods = await prisma.food.findMany({ include: { category: true } });
    const mappedFoods = foods.map(f => ({
      _id: f.id,
      foodName: f.foodName,
      price: f.price,
      image: f.image,
      ingredients: f.ingredients,
      category: f.category ? f.category.id : "",
    }));

    res.status(200).json(mappedFoods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error deleting food" });
  }
};
