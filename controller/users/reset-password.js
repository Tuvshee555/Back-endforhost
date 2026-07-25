import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../../prismaClient.js";

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Auth not configured" });
    }

    // Verify token signature + expiry, and that it is actually a reset token.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.type !== "reset" || !decoded?.id) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // Enforce single-use: the token hash must match the one we stored and
    // must not have expired / been consumed already.
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const notExpired =
      user.resetTokenExpiry && new Date(user.resetTokenExpiry).getTime() > Date.now();

    if (!user.resetToken || user.resetToken !== tokenHash || !notExpired) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and consume the reset token in one write.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err?.message || err);
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};
