import { prisma } from "../../prismaClient.js";

export const getAllOrder = async (req, res) => {
  try {
    const orders = await prisma.foodOrder.findMany({
      include: {
        user: true, // include user details
        foodOrderItems: {
          include: {
            food: true, // include each food details in the order
          },
        },
      },
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error while getting food orders:", error);
    res.status(500).json({ message: `Error while getting food order: ${error.message}` });
  }
};
