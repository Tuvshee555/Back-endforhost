import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../prismaClient.js";

export const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and role are required!",
      });
    }

    const normalizedEmail = email.toLowerCase();

    // Find user in Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existingUser) {
      return res.status(400).json({
        success: false,
        message: "This account does not exist!",
      });
    }

    // Check password
    if (!existingUser.password) {
      return res.status(400).json({
        success: false,
        message: "Password not set for this account",
      });
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.password);
    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password!",
      });
    }

    // Check role match
    if (existingUser.role !== role) {
      return res.status(403).json({
        success: false,
        message: `This account does not have ${role} access!`,
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("Missing JWT_SECRET in environment");
      return res.status(500).json({ message: "Auth not configured" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: existingUser.id, role: existingUser.role, type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "78h" }
    );

    return res.status(200).json({
      success: true,
      message: "Logged in successfully!",
      user: {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
