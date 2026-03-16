import { prisma } from "../../prismaClient.js";

export const getFood = async (req, res) => {
  try {
    const foods = await prisma.food.findMany({
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
        category: true,
        sizes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(foods);
  } catch (err) {
    console.error("Error fetching foods:", err);
    return res
      .status(500)
      .json({ message: "Error while getting foods" });
  }
};
