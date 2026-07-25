import { prisma } from "../../prismaClient.js";
import { invalidateCatalog } from "../../utils/cache.js";

// 🧩 Delete single food by ID
export const deleteFood = async (req, res) => {
  const { id } = req.params;

  try {
    // Delete related sizes first (if they exist)
    await prisma.foodSize.deleteMany({
      where: { foodId: id },
    });

    // Delete related order items (optional)
    await prisma.orderItem.deleteMany({
      where: { foodId: id },
    });

    // Finally delete the food
    await prisma.food.delete({
      where: { id },
    });

    invalidateCatalog();

    res.status(200).json({ success: true, message: "Successfully deleted food" });
  } catch (error) {
    console.error("Error deleting food:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Food not found" });
    }

    res.status(500).json({ success: false, message: "Error deleting food" });
  }
};