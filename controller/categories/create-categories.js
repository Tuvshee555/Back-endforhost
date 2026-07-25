// controller/categories/create-categories.js
import { prisma } from "../../prismaClient.js";
import { invalidateCatalog } from "../../utils/cache.js";

// CREATE CATEGORY (optionally with parentId)
export const createCategories = async (req, res) => {
  const { categoryName, parentId } = req.body;

  if (!categoryName || !categoryName.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Category name is required" });
  }

  try {
    // if parentId is provided, optionally we could verify it exists
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return res
          .status(400)
          .json({ success: false, message: "Parent category not found" });
      }
    }

    await prisma.category.create({
      data: {
        categoryName: categoryName.trim(),
        parentId: parentId || null,
      },
    });

    // Return updated category list (flat) – same style as before
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        categoryName: true,
        parentId: true,
        _count: {
          select: {
            foods: true,
            children: true,
          },
        },
      },
      orderBy: { categoryName: "asc" },
    });

    const mapped = categories.map((c) => ({
      id: c.id,
      categoryName: c.categoryName,
      parentId: c.parentId,
      foodCount: c._count.foods,
      childrenCount: c._count.children,
      hasChildren: c._count.children > 0,
    }));

    invalidateCatalog();

    res.status(200).json(mapped);
  } catch (error) {
    console.error("Error creating category:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating category" });
  }
};
