import { prisma } from "../../prismaClient.js";

const REVENUE_STATUSES = ["PAID", "DELIVERING", "DELIVERED"];

const parsePositiveInt = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const toOrderDto = (order) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  paymentMethod: order.paymentMethod,
  totalPrice: order.totalPrice,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  firstName: order.firstName,
  lastName: order.lastName,
  phone: order.phone,
  city: order.city,
  district: order.district,
  khoroo: order.khoroo,
  address: order.address,
  notes: order.notes,
  user: order.user
    ? {
        id: order.user.id,
        email: order.user.email,
        address: order.user.address,
      }
    : null,
  foodOrderItems: (order.foodOrderItems ?? []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    food: item.food
      ? {
          id: item.food.id,
          foodName: item.food.foodName,
          image: item.food.image,
          price: item.food.price,
          categoryId: item.food.categoryId,
        }
      : null,
  })),
  itemsCount: order.foodOrderItems?.length ?? 0,
});

export const getAllOrder = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    if (req.query.mode === "revenue") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const chartStart = new Date(now);
      chartStart.setDate(chartStart.getDate() - 59);

      const [
        totalRevenueAgg,
        weeklyRevenueAgg,
        monthlyRevenueAgg,
        recentRevenueOrders,
        recentPayments,
      ] = await Promise.all([
        prisma.foodOrder.aggregate({
          where: { status: { in: REVENUE_STATUSES } },
          _sum: { totalPrice: true },
        }),
        prisma.foodOrder.aggregate({
          where: {
            status: { in: REVENUE_STATUSES },
            createdAt: { gte: weekStart },
          },
          _sum: { totalPrice: true },
        }),
        prisma.foodOrder.aggregate({
          where: {
            status: { in: REVENUE_STATUSES },
            createdAt: { gte: monthStart },
          },
          _sum: { totalPrice: true },
        }),
        prisma.foodOrder.findMany({
          where: {
            status: { in: REVENUE_STATUSES },
            createdAt: { gte: chartStart },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            orderNumber: true,
            totalPrice: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.foodOrder.findMany({
          where: { status: { in: REVENUE_STATUSES } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            orderNumber: true,
            totalPrice: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

      const chartMap = new Map();
      for (const order of recentRevenueOrders) {
        const dateKey = new Date(order.createdAt).toISOString().slice(0, 10);
        chartMap.set(
          dateKey,
          (chartMap.get(dateKey) ?? 0) + Number(order.totalPrice ?? 0)
        );
      }

      const chartData = Array.from(chartMap.entries()).map(([date, revenue]) => ({
        date,
        revenue,
      }));

      return res.status(200).json({
        stats: {
          totalRevenue: totalRevenueAgg._sum.totalPrice ?? 0,
          weeklyRevenue: weeklyRevenueAgg._sum.totalPrice ?? 0,
          monthlyRevenue: monthlyRevenueAgg._sum.totalPrice ?? 0,
        },
        chartData,
        payments: recentPayments.map((order) => ({
          id: order.id,
          orderId: order.orderNumber ?? order.id,
          amount: Number(order.totalPrice ?? 0),
          status: order.status,
          createdAt: order.createdAt,
        })),
      });
    }

    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 10, 100);
    const search = String(req.query.search ?? "").trim();

    const where = search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { id: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [total, orders] = await Promise.all([
      prisma.foodOrder.count({ where }),
      prisma.foodOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              address: true,
            },
          },
          foodOrderItems: {
            include: {
              food: {
                select: {
                  id: true,
                  foodName: true,
                  image: true,
                  price: true,
                  categoryId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      orders: orders.map(toOrderDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET ALL ORDERS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};
