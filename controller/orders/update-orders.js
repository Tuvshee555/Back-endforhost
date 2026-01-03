import { prisma } from "../../prismaClient.js";

export const updatedFoodOrder = async (req, res) => {
  const { id } = req.params;

  const {
    status,
    location,
  } = req.body;

  try {
    const updatedOrder = await prisma.foodOrder.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(location && { location }),
      },
      include: {
        foodOrderItems: { include: { food: true } },
      },
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error while updating food order:", error);

    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res
      .status(500)
      .json({ success: false, message: "Error while updating food order" });
  }
};
