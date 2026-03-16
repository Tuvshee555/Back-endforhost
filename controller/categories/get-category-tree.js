// controller/categories/get-category-tree.js
import { prisma } from "../../prismaClient.js";

export const getCategoryTree = async (req, res) => {
  try {
    const all = await prisma.category.findMany({
      select: {
        id: true,
        categoryName: true,
        parentId: true,
        _count: {
          select: {
            foods: true,
          },
        },
      },
      orderBy: { categoryName: "asc" },
    });

    const byId = new Map();
    const roots = [];

    // init nodes
    for (const cat of all) {
      byId.set(cat.id, {
        id: cat.id,
        categoryName: cat.categoryName,
        parentId: cat.parentId,
        foodCount: cat._count.foods,
        children: [],
      });
    }

    // link children to parents
    for (const cat of all) {
      const node = byId.get(cat.id);
      if (cat.parentId) {
        const parentNode = byId.get(cat.parentId);
        if (parentNode) parentNode.children.push(node);
        else roots.push(node); // parent missing => treat as root to avoid crash
      } else {
        roots.push(node);
      }
    }

    res.status(200).json(roots);
  } catch (error) {
    console.error("Error building category tree:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching category tree" });
  }
};
