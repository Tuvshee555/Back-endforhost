import { prisma } from "../../prismaClient.js";

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany(); // specify the model

    res.status(200).json(users);
  } catch (err) {
    console.error("Error while getting users:", err);
    res.status(500).json({ message: `Error while getting users: ${err.message}` });
  }
};
