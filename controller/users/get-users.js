import { prisma } from "../../prismaClient.js";
import { USER_PUBLIC_SELECT } from "../../utils/serializeUser.js";

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: USER_PUBLIC_SELECT,
    });

    res.status(200).json(users);
  } catch (err) {
    console.error("Error while getting users:", err);
    res.status(500).json({ message: `Error while getting users: ${err.message}` });
  }
};
