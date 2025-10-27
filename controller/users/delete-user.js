import { prisma } from "../../prismaClient.js"; // make sure you have prismaClient.js exporting prisma

export const deleteUser = async (req, res) => {
  const { id } = req.body; // use "id" instead of "_id"

  if (!id) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  try {
    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: "Successfully deleted user" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, message: "Error deleting user", error: error.message });
  }
};
