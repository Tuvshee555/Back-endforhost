import { prisma } from "../../prismaClient.js";

export const updateItems = async (req, res) => {
  const { id, quantity } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: "Item ID is required" });
  }

  try {
    const updatedItem = await prisma.orderItem.update({
      where: { id },
      data: { quantity },
      include: {
        food: true,   // include related food details
        order: true,  // include related order details
      },
    });

    res.status(202).json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Error while updating item:", error);
    res.status(500).json({ success: false, message: `Error while updating item: ${error.message}` });
  }
};
