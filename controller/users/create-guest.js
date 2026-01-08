// controller/users/create-guest.js
import { prisma } from "../../prismaClient.js";
import jwt from "jsonwebtoken";

export const createGuestUser = async (req, res) => {
  try {
    const { guestId } = req.body;
    if (!guestId) {
      return res.status(400).json({ success: false, message: "guestId missing" });
    }

    const user = await prisma.user.upsert({
      where: { id: guestId },
      update: {}, // nothing to update
      create: {
        id: guestId,
        email: `guest-${guestId}@guest.com`,
        role: "USER",
      },
    });

    // Sign a JWT using the same secret you use elsewhere
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "14d",
    });

    return res.json({ success: true, token, user });
  } catch (err) {
    console.error("Guest create error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
