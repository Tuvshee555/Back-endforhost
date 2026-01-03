// controller/orders/create-orders.js
import { prisma } from "../../prismaClient.js";

export const createFoodOrder = async (req, res) => {
  try {
    const userId = req.user?.id;

    // destructure everything we expect from body (notes included)
    const {
      totalPrice,
      items,
      location: bodyLocation,
      address: bodyAddress,
      notes: bodyNotes,
    } = req.body;

    // more verbose debugging: log full body + headers (safely)
    console.log("CREATE ORDER REQUEST - userId:", userId);
    console.log("BODY:", {
      totalPrice,
      itemsLength: Array.isArray(items) ? items.length : 0,
      location: bodyLocation,
      address: bodyAddress,
      notes: bodyNotes,
    });

    // Normalize location: prefer body.location, fallback to body.address (if frontend sends address)
    const rawLocation = bodyLocation ?? bodyAddress ?? "";
    const location =
      typeof rawLocation === "string" ? rawLocation.trim() : String(rawLocation);

    // Normalize notes (optional)
    const notes =
      typeof bodyNotes === "string" ? bodyNotes.trim() : bodyNotes ?? null;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!location || typeof totalPrice === "undefined")
      return res.status(400).json({ message: "Missing fields" });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "Items required" });

    const normalizedItems = items
      .map((it) => ({
        foodId: typeof it.foodId === "string" ? it.foodId : null,
        quantity: Number(it.quantity) || 0,
      }))
      .filter((it) => it.foodId && it.quantity > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: "No valid items provided" });
    }

    const uniqueFoodIds = [...new Set(normalizedItems.map((i) => i.foodId))];

    const existingFoods = await prisma.food.findMany({
      where: { id: { in: uniqueFoodIds } },
      select: { id: true },
    });
    const existingSet = new Set(existingFoods.map((f) => f.id));
    const missingIds = uniqueFoodIds.filter((id) => !existingSet.has(id));
    if (missingIds.length > 0) {
      console.warn("CREATE ORDER - missing food ids:", missingIds);
      return res.status(400).json({
        message: "Some items are no longer available",
        missingIds,
      });
    }

    // create order inside transaction (atomic)
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.foodOrder.create({
        data: {
          userId,
          totalPrice: Number(totalPrice),
          location,
          notes: notes ?? null,
          foodOrderItems: {
            create: normalizedItems.map((item) => ({
              foodId: item.foodId,
              quantity: item.quantity,
            })),
          },
        },
        include: { foodOrderItems: true },
      });
      return created;
    });

    console.log("ORDER CREATED:", {
      orderId: order.id,
      itemsCount: order.foodOrderItems.length,
      location: order.location,
      notes: order.notes ?? null,
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    return res.status(500).json({ message: "Order creation failed" });
  }
};
