import { prisma } from "../../prismaClient.js";

export const deleteAllFoods = async (req, res) => {
  try {
    await prisma.foodSize.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.food.deleteMany();

    res.json({ success: true, message: "All foods deleted successfully" });
  } catch (error) {
    console.error("Error deleting all foods:", error);
    res.status(500).json({ error: "Failed to delete all foods" });
  }
};
