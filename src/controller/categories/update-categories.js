import { prisma } from "../../prismaClient.js";

export const updateCategories = async (req, res) => {
  const { id, categoryName } = req.body;

  if (!id || !categoryName) {
    return res
      .status(400)
      .json({ success: false, message: "Category ID and name are required" });
  }

  try {
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { categoryName },
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
