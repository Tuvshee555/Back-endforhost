// controller/categories/get-catagories.js
import { prisma } from "../../prismaClient.js";

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

    const categories = await prisma.category.findMany({
      where,
      include: {
        foods: true,
        children: true,
      },
      orderBy: { categoryName: "asc" },
    });

    const mapped = categories.map((cat) => ({
      id: cat.id,
      categoryName: cat.categoryName,
      parentId: cat.parentId,
      foodCount: cat.foods.length,
      childrenCount: cat.children.length,
      hasChildren: cat.children.length > 0,
    }));

    res.status(200).json(mapped);
  } catch (err) {
    console.error("Error while getting categories:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching categories" });
  }
};
