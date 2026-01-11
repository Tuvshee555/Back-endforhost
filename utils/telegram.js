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
          .map((it) => `- ${it.food?.foodName ?? "Хоол"} x${it.quantity ?? 1}`)
          .join("\n")
      : "- (Бараа алга)";

  const address =
    `${order.city ?? ""} ${order.district ?? ""} ${order.khoroo ?? ""} ${
      order.address ?? ""
    }`.trim() || "-";

  return (
    `🛒 ШИНЭ ЗАХИАЛГА!\n\n` +
    `🧾 Захиалгын дугаар: #${order.orderNumber}\n` +
    `💰 Нийт дүн: ${Number(order.totalPrice).toLocaleString()}₮\n` +
    `💳 Төлбөр: ${order.paymentMethod || "-"}\n` +
    `📌 Статус: ${order.status || "-"}\n\n` +
    `👤 Нэр: ${customer || "-"}\n` +
    `📧 И-мэйл: ${order.email || "-"}\n` +
    `📞 Утас: ${order.phone || "-"}\n` +
    `📍 Хаяг: ${address}\n` +
    (order.notes ? `📝 Тэмдэглэл: ${order.notes}\n` : "") +
    `\n🍔 Захиалсан хоол:\n${items}`
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
    `${emoji} ЗАХИАЛГЫН СТАТУС ШИНЭЧЛЭГДЛЭЭ\n\n` +
    `🧾 Захиалгын дугаар: #${order.orderNumber}\n` +
    `💰 Нийт дүн: ${Number(order.totalPrice).toLocaleString()}₮\n` +
    `💳 Төлбөр: ${order.paymentMethod || "-"}\n\n` +
    `📌 ${oldStatus} → ${newStatus}\n\n` +
    `👤 Нэр: ${customer || "-"}\n` +
    // `📧 И-мэйл: ${order.email || "-"}\n` +
    `📞 Утас: ${order.phone || "-"}`
  );
}
