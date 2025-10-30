import { prisma } from "../prismaClient.js";

export const validateRole = async (req, res, next) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not provided." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }

    console.log(user.role === "USER" ? "USER" : "ADMIN");

    next();
  } catch (error) {
    console.error("Error in validateRole:", error);
    res
      .status(500)
      .json({ success: false, message: `Server error: ${error.message}` });
  }
};
