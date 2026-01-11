export async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("Telegram env missing");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log("Telegram send failed:", errText);
    }
  } catch (err) {
    console.log("Telegram error:", err);
  }
}

export function formatOrderMessage(order) {
  const customer = `${order.firstName ?? ""} ${order.lastName ?? ""}`.trim();

  const items =
    order.foodOrderItems?.length > 0
      ? order.foodOrderItems
          .map((it) => `- ${it.food?.foodName ?? "Food"} x${it.quantity}`)
          .join("\n")
      : "- (no items)";

  return (
    `🛒 NEW ORDER!\n\n` +
    `🧾 Order: #${order.orderNumber}\n` +
    `💰 Total: ${Number(order.totalPrice).toLocaleString()}₮\n` +
    `💳 Payment: ${order.paymentMethod}\n` +
    `📌 Status: ${order.status}\n\n` +
    `👤 Name: ${customer || "-"}\n` +
    `📞 Phone: ${order.phone || "-"}\n` +
    `📍 Address: ${order.city || ""} ${order.district || ""} ${order.khoroo || ""} ${order.address || ""}`.trim() +
    `\n` +
    (order.notes ? `📝 Notes: ${order.notes}\n` : "") +
    `\n🍔 Items:\n${items}`
  );
}
export function formatOrderStatusMessage(order, oldStatus, newStatus) {
  const emoji =
    newStatus === "PAID"
      ? "✅"
      : newStatus === "DELIVERED"
      ? "🏁"
      : newStatus === "DELIVERING"
      ? "🚚"
      : newStatus === "CANCELLED"
      ? "❌"
      : "🔔";

  const customer = `${order.firstName ?? ""} ${order.lastName ?? ""}`.trim();

  return (
    `${emoji} ORDER STATUS UPDATED\n\n` +
    `🧾 Order: #${order.orderNumber}\n` +
    `💰 Total: ${Number(order.totalPrice).toLocaleString()}₮\n` +
    `💳 Payment: ${order.paymentMethod}\n\n` +
    `📌 ${oldStatus} → ${newStatus}\n` +
    `👤 ${customer || "-"}\n` +
    `📞 ${order.phone || "-"}`
  );
}
