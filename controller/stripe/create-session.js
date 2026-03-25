// controller/stripe/create-session.js
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const DEFAULT_CURRENCY = process.env.PAYMENT_CURRENCY || "usd";
const FALLBACK_TO_ORDER_SUMMARY = process.env.FALLBACK_TO_ORDER_SUMMARY === "true";

function toCents(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

async function findRelatedProductPrice(item) {
  const fkCandidates = ["foodId", "food_id", "productId", "product_id", "menuItemId", "menu_item_id"];
  const modelCandidates = ["food", "product", "menuItem", "dish", "item", "Food", "Product"];

  for (const fk of fkCandidates) {
    if (typeof item[fk] !== "undefined" && item[fk] !== null) {
      const fkVal = item[fk];
      for (const modelName of modelCandidates) {
        if (!prisma[modelName]) continue;
        try {
          const found = await prisma[modelName].findUnique({
            where: { id: fkVal },
          }).catch(() => null);
          if (found) {
            return {
              price: found.price ?? found.unit_price ?? found.unitPrice ?? found.cost ?? found.amount ?? null,
              name: found.name ?? found.title ?? found.productName ?? null,
              image: found.image ?? found.images?.[0] ?? null,
            };
          }
        } catch (e) {
          // ignore and continue
        }
      }
    }
  }

  if (item.food) {
    return {
      price: item.food.price ?? item.food.unit_price ?? item.food.unitPrice ?? null,
      name: item.food.name ?? item.food.title ?? null,
      image: item.food.image ?? null,
    };
  }

  return null;
}

export async function createSession(req, res) {
  try {
    console.log("createSession â€” raw body:", req.body);
    const { orderId: rawOrderId, totalPrice } = req.body || {};
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (typeof rawOrderId === "undefined" || rawOrderId === null || rawOrderId === "") {
      return res.status(400).json({ error: "Missing orderId in request body", received: req.body });
    }

    const orderIdNum = Number(rawOrderId);
    let order = null;
    if (!Number.isNaN(orderIdNum)) {
      order = await prisma.foodOrder.findUnique({ where: { id: orderIdNum } }).catch(() => null);
    }
    if (!order) {
      order = await prisma.foodOrder.findUnique({ where: { id: rawOrderId } }).catch(() => null);
    }
    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        providedOrderId: rawOrderId,
        note: "Server attempted numeric and string lookups. Check your Prisma schema foodOrder.id type.",
      });
    }

    if (requesterRole !== "ADMIN" && order.userId !== requesterId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (["PAID", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({ error: "This order cannot be paid" });
    }

    const candidateRelations = ["foodOrderItems", "items", "orderItems", "food_order_items", "foodOrder_item"];
    let items = null;
    for (const rel of candidateRelations) {
      try {
        const withRel = await prisma.foodOrder.findUnique({
          where: { id: order.id },
          include: { [rel]: true },
        }).catch(() => null);
        if (withRel && withRel[rel] && Array.isArray(withRel[rel]) && withRel[rel].length) {
          items = withRel[rel];
          console.log(`createSession â€” found items via relation '${rel}'`);
          break;
        }
      } catch (e) {
        // ignore invalid include
      }
    }

    if (!items) {
      const candidateItemModels = ["foodOrderItem", "foodOrderItems", "orderItem", "orderItems", "FoodOrderItem", "FoodOrderItems"];
      for (const modelName of candidateItemModels) {
        if (!prisma[modelName]) continue;
        try {
          const found = await prisma[modelName].findMany({
            where: { foodOrderId: order.id },
          }).catch(() => []);
          if (found && found.length) {
            items = found;
            console.log(`createSession â€” found items via model '${modelName}'`);
            break;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (!items || !items.length) {
      return res.status(400).json({
        error: "Could not find order items for checkout",
        orderId: order.id,
        note: "Inspect your Prisma schema for the correct relation name between FoodOrder and its items.",
      });
    }

    const badItems = [];
    const line_items = [];

    for (const it of items) {
      const name =
        it.name ??
        it.title ??
        it.productName ??
        it.foodName ??
        it.food?.name ??
        it.itemName ??
        null;

      const qty = Number(it.quantity ?? it.qty ?? it.count ?? 1);

      let priceSource =
        it.price ??
        it.unit_price ??
        it.unitPrice ??
        it.amount ??
        it.cost ??
        it.price_mnt ??
        it.price_mnt_value ??
        null;

      if (priceSource == null && (it.food || it.product || it.menuItem)) {
        priceSource =
          it.food?.price ??
          it.product?.price ??
          it.menuItem?.price ??
          it.food?.unit_price ??
          it.product?.unit_price ??
          null;
      }

      if (priceSource == null) {
        const related = await findRelatedProductPrice(it).catch(() => null);
        if (related && related.price != null) {
          priceSource = related.price;
        }
      }

      const cents = toCents(priceSource);
      if (cents === null) {
        badItems.push({ id: it.id ?? null, raw: it });
        continue;
      }

      line_items.push({
        price_data: {
          currency: DEFAULT_CURRENCY,
          product_data: { name: name ?? `Item ${it.id ?? "?"}` },
          unit_amount: cents,
        },
        quantity: qty || 1,
      });
    }

    if (badItems.length) {
      if (!FALLBACK_TO_ORDER_SUMMARY) {
        return res.status(400).json({
          error: "Some order items have no numeric price. Fix item records or enable FALLBACK_TO_ORDER_SUMMARY for temporary testing.",
          problematicItems: badItems,
          note:
            "Check item objects (fields) and your DB schema. Common price fields: price, unit_price, unitPrice, amount. " +
            "If your items reference a product by productId/foodId, ensure the product has a price field.",
        });
      }

      const fallbackAmount = toCents(order.totalPrice ?? totalPrice ?? 0);
      if (fallbackAmount === null || fallbackAmount <= 0) {
        return res.status(400).json({
          error: "Items missing prices and fallback order total is invalid; cannot create checkout.",
          problematicItems: badItems,
        });
      }
      line_items.length = 0;
      line_items.push({
        price_data: {
          currency: DEFAULT_CURRENCY,
          product_data: { name: `Order #${order.id}` },
          unit_amount: fallbackAmount,
        },
        quantity: 1,
      });
      console.log("createSession â€” using fallback order summary for checkout (FALLBACK_TO_ORDER_SUMMARY=true)");
    }

    const deliveryCandidates = ["deliveryFee", "delivery_fee", "delivery", "deliveryPrice"];
    for (const key of deliveryCandidates) {
      if (typeof order[key] !== "undefined" && order[key] !== null) {
        const d = toCents(order[key]);
        if (d !== null && d > 0) {
          line_items.push({
            price_data: {
              currency: DEFAULT_CURRENCY,
              product_data: { name: "Delivery Fee" },
              unit_amount: d,
            },
            quantity: 1,
          });
        }
        break;
      }
    }

    if (!line_items.length) {
      return res.status(400).json({ error: "No valid line items constructed for Stripe" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      metadata: { orderId: String(order.id) },
      success_url: `${process.env.STRIPE_SUCCESS_URL}?orderId=${encodeURIComponent(order.id)}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}?orderId=${encodeURIComponent(order.id)}`,
    });

    try {
      await prisma.payment.create({
        data: {
          invoiceId: session.id,
          orderId: typeof order.id === "number" ? order.id : String(order.id),
          amount: Number(order.totalPrice ?? totalPrice ?? 0),
          status: "PENDING",
        },
      });
    } catch (e) {
      console.warn("createSession â€” payment creation failed:", e?.message || e);
    }

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createSession error:", err?.message || err, err?.stack || "");
    return res.status(500).json({ error: err?.message || "Server error creating session" });
  }
}
