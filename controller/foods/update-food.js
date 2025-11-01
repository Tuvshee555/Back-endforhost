import { prisma } from "../../prismaClient.js";

export const updateFood = async (req, res) => {
  const { id } = req.params;
  const { foodName, price, image, ingredients, categoryId, address } = req.body;

  if (!id) return res.status(400).json({ error: "Missing food ID" });

  try {
    const updatedFood = await prisma.food.update({
      where: { id },
      data: {
        foodName: foodName || "",
        price: price ? parseFloat(price) : undefined,
        image: image || "",
        ingredients: ingredients || "",
        address: address || null,
        categoryId: categoryId || null,
      },
      include: { category: true },
    });

    res.json(updatedFood);
  } catch (error) {
    console.error("Error updating food:", error);
    res.status(500).json({ error: "Failed to update food" });
  }
};

