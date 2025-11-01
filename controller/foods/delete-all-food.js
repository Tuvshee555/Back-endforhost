import { prisma } from "../../prismaClient.js";

export const deleteAllFoods = async (req, res) => {
  try {
    await prisma.food.deleteMany(); // deletes every record in the Food table
    res.json({ message: "All foods deleted successfully" });
  } catch (error) {
    console.error("Error deleting all foods:", error);
    res.status(500).json({ error: "Failed to delete all foods" });
  }
};
