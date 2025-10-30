import { prisma } from "../../prismaClient.js";

export const updateFood = async (req, res) => {
  const { _id, foodName, price, image, ingredients, categoryId } = req.body;

  if (!_id) return res.status(400).json({ message: "Food _id is required" });

  try {
    // Make sure Prisma's id matches your DB schema primary key
    const updatedFood = await prisma.food.update({
      where: { id: _id }, // <-- id must exist in DB
      data: {
        foodName,
        price: Number(price),
        ingredients,
        ...(image && { image }),
        ...(categoryId && { categoryId }),
      },
    });

    res.status(200).json(updatedFood);
  } catch (error) {
    console.error("Error while updating food:", error);
    res.status(500).json({ message: "Error while updating food", error: error.message });
  }
};
