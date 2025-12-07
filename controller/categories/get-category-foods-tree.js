// controller/categories/get-category-foods-tree.js
import { prisma } from "../../prismaClient.js";

/**
 * GET /category/:id/foods-tree
 * Returns:
 * {
 *   category: { id, categoryName },
 *   foods: Food[]
 * }
 *
 * Foods = all foods whose categoryId is in this category OR any of its descendants.
 */
export const getCategoryFoodsTree = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Category id is required" });
  }

  try {
    // 1) Load all categories (small table, easy to keep in memory)
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        parentId: true,
        categoryName: true,
      },
    });

    const target = categories.find((c) => c.id === id);

    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // 2) Collect all descendant category IDs (BFS/DFS)
    const allIds = new Set();
    allIds.add(target.id);

    const queue = [target.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      for (const c of categories) {
        if (c.parentId === currentId && !allIds.has(c.id)) {
          allIds.add(c.id);
          queue.push(c.id);
        }
      }
    }

    const idList = Array.from(allIds);

    // 3) Fetch all foods whose categoryId is in this tree
    const foods = await prisma.food.findMany({
      where: {
        categoryId: {
          in: idList,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      category: {
        id: target.id,
        categoryName: target.categoryName,
      },
      foods,
    });
  } catch (error) {
    console.error("Error in getCategoryFoodsTree:", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching category foods",
      error: error.message,
    });
  }
};
