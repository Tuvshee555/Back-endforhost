// controller/orders/create-orders.js
import { prisma } from "../../prismaClient.js";

export const createFoodOrder = async (req, res) => {
  try {
    const userId = req.user?.id;

    // structured fields expected from frontend
    const {
      totalPrice,
      items,
      firstName: bodyFirstName,
      lastName: bodyLastName,
      phone: bodyPhone,
      city: bodyCity,
      district: bodyDistrict,
      khoroo: bodyKhoroo,
      address: bodyAddress,
      notes: bodyNotes,
    } = req.body;

    // debug log
    console.log("CREATE ORDER REQUEST - userId:", userId);
    console.log("BODY:", {
      totalPrice,
      itemsLength: Array.isArray(items) ? items.length : 0,
      firstName: bodyFirstName,
      lastName: bodyLastName,
      phone: bodyPhone,
      city: bodyCity,
      district: bodyDistrict,
      khoroo: bodyKhoroo,
      address: bodyAddress,
      notes: bodyNotes,
    });

    // basic auth / payload validation
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (typeof totalPrice === "undefined" || Number.isNaN(Number(totalPrice)))
      return res.status(400).json({ message: "Missing or invalid totalPrice" });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "Items required" });

    // normalize incoming strings (trim) or set null
    const safeString = (v) =>
      typeof v === "string" && v.trim().length ? v.trim() : null;

    const firstName = safeString(bodyFirstName);
    const lastName = safeString(bodyLastName);
    const phone = safeString(bodyPhone);
    const city = safeString(bodyCity);
    const district = safeString(bodyDistrict);
    const khoroo = safeString(bodyKhoroo);
    const address = safeString(bodyAddress);
    const notes = safeString(bodyNotes);

    // require at least some delivery info (address or city) to avoid empty orders
    const hasDeliveryInfo = Boolean(address || city || district || khoroo || phone);
    if (!hasDeliveryInfo)
      return res
        .status(400)
        .json({ message: "Delivery information required (address/city/phone)" });

    // normalize items: ensure foodId present and quantity is positive
    const normalizedItems = items
      .map((it) => ({
        foodId: typeof it.foodId === "string" ? it.foodId : null,
        quantity: Number(it.quantity) || 0,
      }))
      .filter((it) => it.foodId && it.quantity > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: "No valid items provided" });
    }

    // validate food ids exist
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

    // create order inside a transaction (atomic)
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.foodOrder.create({
        data: {
          userId,
          totalPrice: Number(totalPrice),

          // structured delivery fields
          firstName,
          lastName,
          phone,
          city,
          district,
          khoroo,
          address,
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
      firstName: order.firstName,
      lastName: order.lastName,
      phone: order.phone,
      city: order.city,
      district: order.district,
      khoroo: order.khoroo,
      address: order.address,
      notes: order.notes ?? null,
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    return res.status(500).json({ message: "Order creation failed" });
  }
};
