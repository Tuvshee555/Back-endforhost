import { prisma } from "../../prismaClient.js";

export const updateUser = async (req, res) => {
  const userData = req.body;
  const { id } = req.params;

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: userData,
    });

    res.status(202).json({ success: true, user: updatedUser });
  } catch (error) {
    if (error.code === "P2025") { // Prisma error for record not found
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    res.status(500).json({
      success: false,
      message: `Error while updating user: ${error.message}`,
    });
  }
};
