import { prisma } from "../../utils/prisma.js";

function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const r = Math.floor(n);
  if (r < 1 || r > 5) return null;
  return r;
}

export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const rating = clampRating(req.body.rating);
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (!rating) return res.status(400).json({ message: "Rating must be 1-5" });
    if (comment.length < 2 || comment.length > 800) {
      return res.status(400).json({ message: "Comment must be 2-800 characters" });
    }

    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existing) return res.status(404).json({ message: "Review not found" });
    if (existing.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { rating, comment },
    });

    // refresh food stats
    const stats = await prisma.review.aggregate({
      where: { foodId: existing.foodId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.food.update({
      where: { id: existing.foodId },
      data: {
        avgRating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating ?? 0,
      },
    });

    return res.json({ review: updated });
  } catch (err) {
    console.error("updateReview error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
