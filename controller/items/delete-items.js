import { prisma } from "../../prismaClient.js";

export const deleteItems = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: "id is required" });
  }

  try {
    await prisma.orderItem.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: "Successfully deleted item" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ success: false, message: "Error deleting item", error: error.message });
  }
};
