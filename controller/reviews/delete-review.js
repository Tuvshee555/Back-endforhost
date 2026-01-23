import { prisma } from "../../utils/prisma.js";

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existing) return res.status(404).json({ message: "Review not found" });
    if (existing.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    await prisma.review.delete({
      where: { id: reviewId },
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

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteReview error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
