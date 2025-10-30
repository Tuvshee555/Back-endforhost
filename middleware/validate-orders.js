import { prisma } from "../prismaClient.js";

export const validateFoodOrder = async (req, res, next) => {
  const { id } = req.body;

  try {
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID not provided." });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    next();
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: `Server error: ${error.message}` });
  }
};
