import { prisma } from "../../prismaClient.js";

// ✅ Get total, weekly, and monthly revenue
export const getRevenueStats = async (req, res) => {
  try {
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);

    // Run the three aggregates in parallel instead of one-after-another.
    const [totalRevenue, monthlyRevenue, weeklyRevenue] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "PAID" },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "PAID",
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "PAID",
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      weeklyRevenue: weeklyRevenue._sum.amount || 0,
    });
  } catch (err) {
    console.error("❌ Failed to fetch revenue stats:", err);
    res.status(500).json({ error: "Failed to fetch revenue stats" });
  }
};

// ✅ Get daily chart data and recent payments
export const getPaymentsStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);

    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map();
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split("T")[0];
      dailyMap.set(key, 0);
    }

    for (const p of payments) {
      const key = p.createdAt.toISOString().split("T")[0];
      if (dailyMap.has(key) && p.status === "PAID") {
        dailyMap.set(key, dailyMap.get(key) + p.amount);
      }
    }

    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    const recentPayments = await prisma.payment.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    res.json({ dailyRevenue, recentPayments });
  } catch (err) {
    console.error("❌ Failed to fetch payments:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
};
