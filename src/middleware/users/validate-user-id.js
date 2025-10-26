import { prisma } from "../../prismaClient.js";

export const validateUserId = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID not provided, invalid input" });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    next();
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: `Error: ${error.message}` });
  }
};
