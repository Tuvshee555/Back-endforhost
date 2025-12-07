// controller/categories/update-categories.js
import { prisma } from "../../prismaClient.js";

export const updateCategories = async (req, res) => {
  const { id, categoryName, parentId } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Category ID is required" });
  }

  const data = {};

  if (typeof categoryName === "string" && categoryName.trim().length > 0) {
    data.categoryName = categoryName.trim();
  }

  // if parentId is provided (can be null), update it
  if (parentId !== undefined) {
    data.parentId = parentId || null;
  }

  try {
    // optional: prevent self-parent
    if (parentId && parentId === id) {
      return res
        .status(400)
        .json({ success: false, message: "Category cannot be its own parent" });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data,
    });

    res.status(200).json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error("Error while updating category:", error);
    res.status(500).json({
      success: false,
      message: `Error while updating category: ${error.message}`,
    });
  }
};
