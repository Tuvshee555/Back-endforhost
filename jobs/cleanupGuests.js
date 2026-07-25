import { prisma } from "../prismaClient.js";

// Delete stale guest accounts (created by /user/guest) that never turned into a
// real order/review. Keeps the User table from growing without bound.
//
// A guest is safe to delete only if it has NO related rows (orders, order items,
// reviews) — those relations have no cascade, so any guest that actually ordered
// is left untouched.
const GUEST_TTL_DAYS = 30;

export async function cleanupGuestUsers() {
  try {
    const cutoff = new Date(Date.now() - GUEST_TTL_DAYS * 24 * 60 * 60 * 1000);

    const result = await prisma.user.deleteMany({
      where: {
        email: { startsWith: "guest-", endsWith: "@guest.com" },
        createdAt: { lt: cutoff },
        password: null, // real accounts have a password/social identity
        FoodOrder: { none: {} },
        orderedFoods: { none: {} },
        reviews: { none: {} },
      },
    });

    if (result.count > 0) {
      console.log(`🧹 Removed ${result.count} stale guest users (>${GUEST_TTL_DAYS}d, no activity)`);
    }
  } catch (err) {
    console.error("❌ Guest cleanup job failed:", err.message);
  }
}
