import { prisma } from "../../prismaClient.js";

export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (requesterRole !== "ADMIN" && requesterId !== id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phonenumber: true,
        city: true,
        district: true,
        khoroo: true,
        address: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: `Error fetching user: ${error.message}`,
    });
  }
};
