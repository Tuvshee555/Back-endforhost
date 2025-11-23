// controller/user/createGuest.js
import { prisma } from "../../prismaClient.js";

export const createGuestUser = async (req, res) => {
  try {
    const { guestId } = req.body;

    // If exists, return it (prevents duplicates)
    const user = await prisma.user.upsert({
      where: { id: guestId },
      update: {}, // nothing to update
      create: {
        id: guestId,
        email: `guest-${guestId}@guest.com`,
        role: "USER",
      },
    });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("Guest create error:", err);
    return res.status(500).json({ success: false });
  }
};
