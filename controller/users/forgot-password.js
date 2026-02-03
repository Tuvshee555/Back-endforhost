import jwt from "jsonwebtoken";
import { sendEmail } from "../../utils/send-email.js";
import { prisma } from "../../prismaClient.js";

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Forgot password request for:", email);

    // Prisma uses findUnique with a `where` object
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("User found:", user.email);

    // Use user.id (Prisma primary key), not user.id
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Auth not configured" });
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `${process.env.NEXT_PUBLIC_BACKEND_URL}/reset-password?token=${resetToken}`;
    console.log("Reset link:", resetLink);

    await sendEmail(user.email, "Password Reset", `Click here: ${resetLink}`);

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: err.message });
  }
};
