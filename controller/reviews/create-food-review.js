import { prisma } from "../../utils/prisma.js";

function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const r = Math.floor(n);
  if (r < 1 || r > 5) return null;
  return r;
}

export const createFoodReview = async (req, res) => {
  try {
    const { foodId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rating = clampRating(req.body.rating);
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    const images = Array.isArray(req.body.images)
      ? req.body.images.filter((x) => typeof x === "string").slice(0, 6)
      : [];

    if (!rating) {
      return res.status(400).json({ message: "Rating must be 1-5" });
    }

    if (comment.length < 2 || comment.length > 800) {
      return res.status(400).json({ message: "Comment must be 2-800 characters" });
    }

    // ✅ VERIFIED PURCHASE CHECK:
    // user must have PAID / DELIVERING / DELIVERED order containing this food
    const bought = await prisma.orderItem.findFirst({
      where: {
        foodId,
        order: {
          userId,
          status: { in: ["PAID", "DELIVERING", "DELIVERED"] },
        },
      },
      select: { id: true },
    });

    if (!bought) {
      return res.status(403).json({
        message: "You can only review foods you purchased.",
      });
    }

    const created = await prisma.review.create({
      data: {
        foodId,
        userId,
        rating,
        comment,
        images,
        verifiedPurchase: true,
      },
    });

    // update cached stats in Food
    const stats = await prisma.review.aggregate({
      where: { foodId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.food.update({
      where: { id: foodId },
      data: {
        avgRating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating ?? 0,
      },
    });

    return res.status(201).json({ review: created });
  } catch (err) {
    // Prisma unique constraint (already reviewed)
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "You already reviewed this food." });
    }

    console.error("createFoodReview error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
