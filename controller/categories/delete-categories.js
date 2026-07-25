import { prisma } from "../../prismaClient.js";
import { invalidateCatalog } from "../../utils/cache.js";

export const deleteCategories = async (req, res) => {
  const { id } = req.body; // Use 'id' instead of '_id' for clarity

  if (!id) {
    return res.status(400).json({ success: false, message: "Category ID is required" });
  }

  try {
    await prisma.category.delete({
      where: { id },
    });

    invalidateCatalog();

    res
      .status(200)
      .json({ success: true, message: "Successfully deleted category" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting category", error: error.message });
  }
};
