// controller/categories/get-catagories.js
import { prisma } from "../../prismaClient.js";
import { cached } from "../../utils/cache.js";

export const getCategories = async (req, res) => {
  const { parentId } = req.query;

  try {
    const where = {};

    // filter by parent if requested
    if (parentId === "root") {
      where.parentId = null;
    } else if (typeof parentId === "string" && parentId.length > 0) {
      where.parentId = parentId;
    }

    const cacheKey = `categories:list:${parentId ?? "all"}`;
    const mapped = await cached(cacheKey, 30_000, async () => {
      const categories = await prisma.category.findMany({
        where,
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

      return categories.map((cat) => ({
        id: cat.id,
        categoryName: cat.categoryName,
        parentId: cat.parentId,
        foodCount: cat._count.foods,
        childrenCount: cat._count.children,
        hasChildren: cat._count.children > 0,
      }));
    });

    res.status(200).json(mapped);
  } catch (err) {
    console.error("Error while getting categories:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching categories" });
  }
};
