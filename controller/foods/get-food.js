import { prisma } from "../../prismaClient.js";

export const getFood = async (req, res) => {
  try {
    const foods = await prisma.food.findMany({
      include: {
        category: true,
        sizes: true,
        OrderItem: {
          where: {
            order: {
              status: { in: ["PAID", "DELIVERED"] },
            },
          },
          select: {
            quantity: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 🔥 derive salesCount dynamically
    const foodsWithSales = foods.map((food) => {
      const salesCount = food.OrderItem.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      const { OrderItem, ...rest } = food;
      return {
        ...rest,
        salesCount,
      };
    });

    return res.status(200).json(foodsWithSales);
  } catch (err) {
    console.error("Error fetching foods:", err);
    return res
      .status(500)
      .json({ message: "Error while getting foods" });
  }
};
