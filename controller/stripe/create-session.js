// controller/stripe/create-session.js
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const DEFAULT_CURRENCY = process.env.PAYMENT_CURRENCY || "usd";

function toCents(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export async function createSession(req, res) {
  try {
    console.log("createSession — raw body:", req.body);
    const { orderId: rawOrderId, totalPrice } = req.body || {};

    if (typeof rawOrderId === "undefined" || rawOrderId === null || rawOrderId === "") {
      return res.status(400).json({ error: "Missing orderId in request body", received: req.body });
    }

    // Determine lookup key (try numeric then string)
    const orderIdNum = Number(rawOrderId);
    let order = null;

    if (!Number.isNaN(orderIdNum)) {
      console.log("createSession — numeric lookup attempt id=", orderIdNum);
      order = await prisma.foodOrder.findUnique({
        where: { id: orderIdNum },
      }).catch((e) => {
        console.warn("createSession — numeric lookup failed:", e?.message || e);
        return null;
      });
    }

    if (!order && typeof rawOrderId === "string") {
      console.log("createSession — string lookup attempt id=", rawOrderId);
      order = await prisma.foodOrder.findUnique({
        where: { id: rawOrderId },
      }).catch((e) => {
        console.warn("createSession — string lookup failed:", e?.message || e);
        return null;
      });
    }

    if (!order) {
      return res.status(404).json({
        error: "Order not found with provided orderId",
        providedOrderId: rawOrderId,
        note: "Server attempted numeric and string lookups. Check foodOrder.id type in Prisma schema.",
      });
    }

    // Try to fetch order items in multiple safe ways.
    // 1) Try include by several likely relation names
    const candidateRelationNames = ["items", "foodOrderItems", "orderItems", "foodOrder_item", "food_order_items"];
    let items = null;

    for (const rel of candidateRelationNames) {
      try {
        const withRel = await prisma.foodOrder.findUnique({
          where: { id: order.id },
          include: { [rel]: true },
        });
        if (withRel && withRel[rel] && Array.isArray(withRel[rel]) && withRel[rel].length) {
          items = withRel[rel];
          console.log(`createSession — found items via relation include '${rel}'`);
          break;
        }
      } catch (e) {
        // include may be invalid for this relation name — ignore and try next
        // console.warn(`include '${rel}' failed:`, e?.message || e);
      }
    }

    // 2) If still not found, try querying common item models directly (if they exist)
    const candidateItemModels = ["foodOrderItem", "foodOrderItems", "orderItem", "orderItems", "items"];
    for (const modelName of candidateItemModels) {
      if (items) break;
      if (!prisma[modelName]) continue; // model doesn't exist on client
      try {
        // Try common where fields
        const tries = [
          { foodOrderId: order.id },
          { orderId: order.id },
          { order_id: order.id }, // unlikely but safe
        ];
        for (const where of tries) {
          const found = await prisma[modelName].findMany({ where }).catch(() => null);
          if (found && found.length) {
            items = found;
            console.log(`createSession — found items via model '${modelName}' using where=${JSON.stringify(where)}`);
            break;
          }
        }
      } catch (e) {
        // ignore and continue
      }
    }

    // If still no items, return a helpful error telling the dev which model/fields to inspect
    if (!items || !items.length) {
      return res.status(400).json({
        error: "Could not find order items for checkout",
        orderId: order.id,
        note:
          "Your Prisma schema probably uses a different relation or model name for order items. " +
          "Open prisma/schema.prisma and check the FoodOrder model relations (look for fields referencing another model). " +
          "Common names: items, foodOrderItems, foodOrderItem, orderItems, orderItem. " +
          "Tell me the exact field or model name and I'll update this code.",
      });
    }

    // Build Stripe line_items
    const line_items = items.map((it) => {
      // attempt to read common fields
      const name = it.name || it.title || it.productName || it.foodName || `Item ${it.id}`;
      const priceSource = it.price ?? it.unit_price ?? it.unitPrice ?? it.amount ?? it.cost;
      const qty = it.quantity ?? it.qty ?? it.count ?? 1;
      const unitCents = toCents(priceSource);
      if (unitCents === null) throw new Error(`Invalid price for order item id=${it.id}`);
      return {
        price_data: {
          currency: DEFAULT_CURRENCY,
          product_data: { name },
          unit_amount: unitCents,
        },
        quantity: Number(qty) || 1,
      };
    });

    // delivery fee detection (try several fields on order)
    const deliveryCandidates = ["deliveryFee", "delivery_fee", "delivery", "deliveryPrice", "deliveryPriceMNT"];
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
      return res.status(400).json({ error: "No valid line items could be constructed for Stripe checkout" });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      metadata: { orderId: String(order.id) },
      success_url: `${process.env.STRIPE_SUCCESS_URL}?orderId=${encodeURIComponent(order.id)}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}?orderId=${encodeURIComponent(order.id)}`,
    });

    // Create a payment record (best-effort)
    try {
      await prisma.payment.create({
        data: {
          invoiceId: session.id,
          orderId: typeof order.id === "number" ? order.id : String(order.id),
          amount: Number(order.totalPrice || totalPrice || 0),
          status: "PENDING",
        },
      });
    } catch (e) {
      console.warn("createSession — payment creation failed:", e?.message || e);
    }

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createSession error:", err?.message || err, err?.stack || "");
    return res.status(500).json({ error: err?.message || "Server error creating session" });
  }
}
