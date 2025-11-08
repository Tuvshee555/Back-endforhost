import { prisma } from "../../prismaClient.js";

export const updateFood = async (req, res) => {
  const { id } = req.params;
  const {
    foodName,
    price,
    image,          // main image (string)
    extraImages,    // array of URLs
    ingredients,
    categoryId,
    address,
    video,
    sizes,          // ["S", "M", "L"]
  } = req.body;

  if (!id) return res.status(400).json({ error: "Missing food ID" });

  try {
    const updatedFood = await prisma.food.update({
      where: { id },
      data: {
        foodName: foodName || undefined,
        price: price ? parseFloat(price) : undefined,
        image: typeof image === "string" ? image : undefined,
        extraImages: Array.isArray(extraImages) ? extraImages : undefined,
        ingredients: ingredients || undefined,
        address: address || undefined,
        categoryId: categoryId || undefined,
        video: video || undefined,
        sizes: sizes
          ? {
              deleteMany: {},
              create: sizes.map((label) => ({ label })),
            }
          : undefined,
      },
      include: {
        category: true,
        sizes: true,
      },
    });

    res.json(updatedFood);
  } catch (error) {
    console.error("Error updating food:", error);
    res.status(500).json({
      error: "Failed to update food",
      details: error.message,
    });
  }
};
