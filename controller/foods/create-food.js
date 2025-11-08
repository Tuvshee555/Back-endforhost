import { prisma } from "../../prismaClient.js";

export const createFood = async (req, res) => {
  const { foodName, price, image, video, ingredients, categoryId, sizes } = req.body;

  try {
    const newFood = await prisma.food.create({
      data: {
        foodName,
        price: parseFloat(price),
        image, // array of image URLs
        video,
        ingredients,
        categoryId,
        sizes: {
          create: (sizes || []).map((label) => ({ label })),
        },
      },
      include: {
        category: true,
        sizes: true,
      },
    });

    res.status(201).json(newFood);
  } catch (error) {
    console.error("Error creating food:", error);
    res.status(500).json({ message: "Error creating food", error: error.message });
  }
};
