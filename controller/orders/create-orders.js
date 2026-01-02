import { prisma } from "../../prismaClient.js";

export const createFoodOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { totalPrice, items, location } = req.body;

    console.log("CREATE ORDER REQUEST:", { userId, totalPrice, itemsLength: Array.isArray(items) ? items.length : 0 });

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!location || typeof totalPrice === "undefined") return res.status(400).json({ message: "Missing fields" });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Items required" });

    // Normalize items -> ensure foodId present and quantity valid
    const normalizedItems = items.map((it) => ({
      foodId: typeof it.foodId === "string" ? it.foodId : null,
      quantity: Number(it.quantity) || 0,
    })).filter(it => it.foodId && it.quantity > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: "No valid items provided" });
    }

    // Unique foodIds for validation
    const uniqueFoodIds = [...new Set(normalizedItems.map(i => i.foodId))];

    // Query existing food ids
    const existingFoods = await prisma.food.findMany({
      where: { id: { in: uniqueFoodIds } },
      select: { id: true },
    });
    const existingSet = new Set(existingFoods.map(f => f.id));

    // Find missing ids
    const missingIds = uniqueFoodIds.filter(id => !existingSet.has(id));
    if (missingIds.length > 0) {
      console.warn("CREATE ORDER - missing food ids:", missingIds);
      return res.status(400).json({
        message: "Some items are no longer available",
        missingIds,
      });
    }

    // Use transaction for atomic create
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.foodOrder.create({
        data: {
          userId,
          totalPrice: Number(totalPrice),
          location,
          foodOrderItems: {
            create: normalizedItems.map((item) => ({
              foodId: item.foodId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          foodOrderItems: true,
        },
      });
      return created;
    });

    console.log("ORDER CREATED:", { orderId: order.id, itemsCount: order.foodOrderItems.length });
    return res.status(201).json(order);
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    // if Prisma P2003 somehow still appears, surface details to logs only
    return res.status(500).json({ message: "Order creation failed" });
  }
};
