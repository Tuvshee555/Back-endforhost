import { prisma } from "../../utils/prisma.js";

export const getFoodReviews = async (req, res) => {
  try {
    const { foodId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { foodId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const r of reviews) {
      ratingCount[r.rating] += 1;
      sum += r.rating;
    }

    const reviewCount = reviews.length;
    const avgRating = reviewCount ? sum / reviewCount : 0;

    return res.json({
      avgRating,
      reviewCount,
      ratingCount,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        verifiedPurchase: r.verifiedPurchase,
        createdAt: r.createdAt,
        user: {
          id: r.user.id,
          name:
            `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || "User",
        },
      })),
    });
  } catch (err) {
    console.error("getFoodReviews error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
