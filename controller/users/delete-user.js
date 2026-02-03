import { prisma } from "../../prismaClient.js";

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required" });
  }

  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  if (!requesterId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // Allow self-delete or admin
  if (requesterRole !== "ADMIN" && requesterId !== id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    await prisma.user.delete({
      where: { id },
    });

    res
      .status(200)
      .json({ success: true, message: "Successfully deleted user" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};
