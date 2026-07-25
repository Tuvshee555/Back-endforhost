// controller/users/create-guest.js
import { prisma } from "../../prismaClient.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { USER_PUBLIC_SELECT } from "../../utils/serializeUser.js";

export const createGuestUser = async (req, res) => {
  try {
    // always generate server-side to prevent spoofing/collisions
    const guestId = crypto.randomUUID();

    const user = await prisma.user.upsert({
      where: { id: guestId },
      update: {}, // nothing to update
      create: {
        id: guestId,
        email: `guest-${guestId}@guest.com`,
        role: "USER",
      },
      select: USER_PUBLIC_SELECT,
    });

    // Sign a JWT using the same secret you use elsewhere
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, type: "access" },
      process.env.JWT_SECRET,
      {
        expiresIn: "14d",
      }
    );

    return res.json({ success: true, token, user });
  } catch (err) {
    console.error("Guest create error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
