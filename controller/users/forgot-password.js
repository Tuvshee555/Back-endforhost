import jwt from "jsonwebtoken";
import { sendEmail } from "../../utils/send-email.js";
import { prisma } from "../../prismaClient.js";

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    console.log("Forgot password request for:", normalizedEmail);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });
    if (!user) {
      return res.json({ message: "If that account exists, a reset email has been sent" });
    }

    console.log("User found:", user.email);

    // Use user.id (Prisma primary key), not user.id
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Auth not configured" });
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetBaseUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL;

    if (!resetBaseUrl) {
      return res.status(500).json({ message: "Reset password URL is not configured" });
    }

    const resetLink = `${resetBaseUrl}/reset-password?token=${resetToken}`;
    console.log("Reset link:", resetLink);

    await sendEmail({
      to: user.email,
      subject: "Password Reset",
      text: `Click here: ${resetLink}`,
    });

    res.json({ message: "If that account exists, a reset email has been sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: err.message });
  }
};
