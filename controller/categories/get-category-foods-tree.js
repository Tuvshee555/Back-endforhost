import { prisma } from "../../prismaClient.js";

/**
 * GET /category/:id/foods-tree
 * Returns:
 * {
 *   success: true,
 *   category: { id, categoryName },
 *   foods: Food[] (with persisted salesCount)
 * }
 */
export const getCategoryFoodsTree = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Category id is required",
    });
  }

  try {
    // 1️⃣ Load all categories
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        parentId: true,
        categoryName: true,
      },
    });

    const target = categories.find((c) => c.id === id);

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // 2️⃣ Collect descendant category IDs (BFS)
    const allIds = new Set([target.id]);
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

    // 3️⃣ Fetch foods in this category tree
    const foods = await prisma.food.findMany({
      where: {
        categoryId: {
          in: idList,
        },
      },
      select: {
        id: true,
        foodName: true,
        price: true,
        image: true,
        address: true,
        ingredients: true,
        categoryId: true,
        createdAt: true,
        extraImages: true,
        updatedAt: true,
        video: true,
        isFeatured: true,
        salesCount: true,
        oldPrice: true,
        discount: true,
        avgRating: true,
        reviewCount: true,
        sizes: true,
        category: true,
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
