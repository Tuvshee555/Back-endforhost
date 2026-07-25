import { prisma } from "../../prismaClient.js";
import { cached } from "../../utils/cache.js";

/**
 * GET /category/:id/foods-tree
 * Returns:
 * {
 *   success: true,
 *   category: { id, categoryName },
 *   foods: Food[]
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
    const payload = await cached(`categories:foodsTree:${id}`, 20_000, async () => {
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          parentId: true,
          categoryName: true,
        },
      });

      const target = categories.find((c) => c.id === id);
      if (!target) return { notFound: true };

      const allIds = new Set([target.id]);
      const queue = [target.id];

      while (queue.length > 0) {
        const currentId = queue.shift();
        for (const category of categories) {
          if (category.parentId === currentId && !allIds.has(category.id)) {
            allIds.add(category.id);
            queue.push(category.id);
          }
        }
      }

      const foods = await prisma.food.findMany({
        where: {
          categoryId: {
            in: Array.from(allIds),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        success: true,
        category: {
          id: target.id,
          categoryName: target.categoryName,
        },
        foods,
      };
    });

    if (payload.notFound) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Error in getCategoryFoodsTree:", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching category foods",
      error: error.message,
    });
  }
};
