import { prisma } from "../../prismaClient.js";

export const updateFood = async (req, res) => {
  const { id, foodName, price, image, ingredients, categoryId } = req.body;

  try {
    const updatedFood = await prisma.food.update({
      where: { id },
      data: {
        foodName,
        price,
        ingredients,
        ...(image && { image }), // only update image if provided
        ...(categoryId && { categoryId }), // only update category if provided
      },
    });

    res.status(200).json(updatedFood);
  } catch (error) {
    console.error("Error while updating food:", error);

    if (error.code === "P2025") {
      // Prisma "Record to update not found"
      return res.status(404).json({ message: "Food item not found" });
    }

    res.status(500).json({ message: "Error while updating food", error: error.message });
  }
};
