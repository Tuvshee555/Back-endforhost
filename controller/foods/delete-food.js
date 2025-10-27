import { prisma } from "../../prismaClient.js";

export const deleteFood = async (req, res) => {
  const { id } = req.params; // Prisma uses `id` instead of `_id`

  try {
    // Delete the food item
    await prisma.food.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: "Successfully deleted food" });
  } catch (error) {
    console.error("Error deleting food:", error);

    // If the food with given id doesn't exist, Prisma throws an error
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Food not found" });
    }

    res.status(500).json({ success: false, message: "Error deleting food" });
  }
};
