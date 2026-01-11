const wrap = (html) => `
  <div style="margin:0;padding:0;background:#f6f7fb;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #eceef3;border-radius:16px;overflow:hidden;">
        <div style="padding:18px 22px;background:linear-gradient(135deg,#111827,#1f2937);color:#fff;">
          <div style="font-size:14px;opacity:.9;">Food Delivery</div>
          <div style="font-size:18px;font-weight:700;margin-top:4px;">Захиалгын мэдээлэл</div>
        </div>

        <div style="padding:22px;">
          ${html}
        </div>

        <div style="padding:16px 22px;border-top:1px solid #eceef3;color:#6b7280;font-size:12px;">
          Энэ и-мэйл автоматаар илгээгдсэн болно. Хэрвээ танд асуулт байвал бидэнтэй холбогдоорой.
        </div>
      </div>

      <div style="text-align:center;color:#9ca3af;font-size:12px;margin-top:14px;">
        © ${new Date().getFullYear()} Food Delivery
      </div>
    </div>
  </div>
`;

const badge = (text, bg = "#EEF2FF", color = "#3730A3") =>
  `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${bg};color:${color};font-size:12px;font-weight:700;">${text}</span>`;

const row = (label, value) => `
  <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed #eceef3;">
    <div style="color:#6b7280;font-size:13px;">${label}</div>
    <div style="color:#111827;font-size:13px;font-weight:600;text-align:right;">${value ?? "-"}</div>
  </div>
`;

const safe = (v) => (typeof v === "string" && v.trim().length ? v.trim() : "-");
const money = (n) => `${Number(n || 0).toLocaleString()}₮`;

// ✅ Order link helper (needs CUSTOMER_URL in backend env)
const orderLink = (orderId) => {
  const base = process.env.CUSTOMER_URL || "https://delivery-customer.shop";
  return `${base.replace(/\/$/, "")}/profile/orders/${orderId}`;
};

const viewOrderButton = (orderId) => `
  <div style="margin-top:16px;text-align:center;">
    <a
      href="${orderLink(orderId)}"
      target="_blank"
      rel="noopener noreferrer"
      style="
        display:inline-block;
        padding:12px 16px;
        border-radius:12px;
        background:#111827;
        color:#ffffff !important;
        text-decoration:none;
        font-weight:800;
        font-size:14px;
        letter-spacing:0.2px;
      "
    >
      🧾 Захиалга харах
    </a>
    <div style="margin-top:10px;font-size:12px;color:#9ca3af;">
      Хэрвээ товчлуур ажиллахгүй бол энэ холбоосыг хуулна уу:
      <div style="margin-top:6px;word-break:break-all;color:#6b7280;">
        ${orderLink(orderId)}
      </div>
    </div>
  </div>
`;

export function orderCreatedEmail(order) {
  const customer = `${safe(order.firstName)} ${safe(order.lastName)}`.trim();
  const address = [order.city, order.district, order.khoroo, order.address]
    .filter(Boolean)
    .join(", ") || "-";

  const itemsHtml =
    order.foodOrderItems?.length > 0
      ? order.foodOrderItems
          .map((it) => {
            const name = it.food?.foodName ?? "Хоол";
            const qty = it.quantity ?? 1;
            return `
              <div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                <div style="color:#111827;font-weight:600;">${name}</div>
                <div style="color:#6b7280;font-weight:700;">x${qty}</div>
              </div>
            `;
          })
          .join("")
      : `<div style="color:#6b7280;">Барааны мэдээлэл алга.</div>`;

  const content = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
      <div>
        <div style="font-size:18px;font-weight:800;color:#111827;">✅ Захиалга амжилттай хүлээн авлаа</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px;">
          Таны захиалгыг бүртгэлээ. Дэлгэрэнгүй мэдээлэл доор байна.
        </div>
      </div>
      ${badge("ШИНЭ ЗАХИАЛГА", "#ECFDF5", "#047857")}
    </div>

    <div style="border:1px solid #eef2f7;border-radius:14px;padding:14px 16px;margin:12px 0;">
      ${row("Захиалгын дугаар", `#${order.orderNumber}`)}
      ${row("Нийт дүн", money(order.totalPrice))}
      ${row("Төлбөрийн хэлбэр", safe(order.paymentMethod))}
      ${row("Статус", safe(order.status))}
    </div>

    <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-top:14px;">
      <div style="border:1px solid #eef2f7;border-radius:14px;padding:14px 16px;">
        <div style="font-weight:800;color:#111827;margin-bottom:10px;">📦 Хүргэлтийн мэдээлэл</div>
        ${row("Нэр", customer || "-")}
        ${row("Утас", safe(order.phone))}
        ${row("Хаяг", address)}
        ${
          order.notes
            ? `<div style="margin-top:10px;padding:12px;border-radius:12px;background:#fff7ed;color:#9a3412;">
                 <b>📝 Тэмдэглэл:</b> ${safe(order.notes)}
               </div>`
            : ""
        }
      </div>

      <div style="border:1px solid #eef2f7;border-radius:14px;padding:14px 16px;">
        <div style="font-weight:800;color:#111827;margin-bottom:10px;">📦 Захиалсан бараа</div>
        ${itemsHtml}
      </div>
    </div>

    ${viewOrderButton(order.id)}

    <div style="margin-top:16px;padding:14px;border-radius:14px;background:#f9fafb;border:1px solid #eef2f7;color:#374151;font-size:13px;">
      💡 Хэрвээ та QPay ашиглаж байгаа бол төлбөр хийгдсэний дараа захиалгын статус <b>PAID</b> болж шинэчлэгдэнэ.
    </div>
  `;

  return wrap(content);
}

export function paymentConfirmedEmail(order) {
  const customer = `${safe(order.firstName)} ${safe(order.lastName)}`.trim();
  const address = [order.city, order.district, order.khoroo, order.address]
    .filter(Boolean)
    .join(", ") || "-";

  const content = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
      <div>
        <div style="font-size:18px;font-weight:800;color:#111827;">✅ Төлбөр амжилттай баталгаажлаа</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px;">
          Таны төлбөр хүлээн авлаа. Захиалгыг боловсруулах ажил эхэлнэ.
        </div>
      </div>
      ${badge("ТӨЛБӨР ТӨЛӨГДСӨН", "#ECFDF5", "#047857")}
    </div>

    <div style="border:1px solid #eef2f7;border-radius:14px;padding:14px 16px;margin:12px 0;">
      ${row("Захиалгын дугаар", `#${order.orderNumber}`)}
      ${row("Төлсөн дүн", money(order.totalPrice))}
      ${row("Төлбөрийн хэлбэр", safe(order.paymentMethod))}
      ${row("Шинэ статус", "PAID")}
    </div>

    <div style="border:1px solid #eef2f7;border-radius:14px;padding:14px 16px;">
      <div style="font-weight:800;color:#111827;margin-bottom:10px;">📦 Хүргэлтийн мэдээлэл</div>
      ${row("Нэр", customer || "-")}
      ${row("Утас", safe(order.phone))}
      ${row("Хаяг", address)}
    </div>

    ${viewOrderButton(order.id)}

    <div style="margin-top:16px;padding:14px;border-radius:14px;background:#f0f9ff;border:1px solid #e0f2fe;color:#075985;font-size:13px;">
      🚚 Захиалга <b>DELIVERING</b> болох үед бид танд дахин мэдээлэх болно.
    </div>
  `;

  return wrap(content);
}

export function orderStatusChangedEmail(order, oldStatus, newStatus) {
  const statusText = {
    DELIVERING: "🚚 Захиалга замдаа гарлаа",
    DELIVERED: "🏁 Захиалга хүргэгдлээ",
    CANCELLED: "❌ Захиалга цуцлагдлаа",
    PAID: "✅ Төлбөр баталгаажлаа",
  };

  const badgeColor =
    newStatus === "DELIVERED"
      ? ["#ECFDF5", "#047857"]
      : newStatus === "DELIVERING"
      ? ["#EFF6FF", "#1D4ED8"]
      : newStatus === "CANCELLED"
      ? ["#FEF2F2", "#B91C1C"]
      : ["#ECFDF5", "#047857"];

  const customer = `${safe(order.firstName)} ${safe(order.lastName)}`.trim();
  const address = [order.city, order.district, order.khoroo, order.address]
    .filter(Boolean)
    .join(", ") || "-";

  const content = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
      <div>
        <div style="font-size:18px;font-weight:800;color:#111827;">
          ${statusText[newStatus] || "🔔 Захиалгын статус шинэчлэгдлээ"}
        </div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px;">
          Захиалгын статус шинэчлэгдлээ. Доорх мэдээллийг шалгана уу.
        </div>
      </div>
      ${badge(
        newStatus,
        badgeColor[0],
        badgeColor[1]
      )}
    </div>

    <div style="border:1px solid #eef2f7;border-radius:14px;padding:14px 16px;margin:12px 0;">
      ${row("Захиалгын дугаар", `#${order.orderNumber}`)}
      ${row("Нийт дүн", money(order.totalPrice))}
      ${row("Төлбөрийн хэлбэр", safe(order.paymentMethod))}
      ${row("Өмнөх статус", safe(oldStatus))}
      ${row("Шинэ статус", safe(newStatus))}
    </div>

    <div style="border:1px solid #eef2f7;border-radius:14px;padding:14px 16px;">
      <div style="font-weight:800;color:#111827;margin-bottom:10px;">📦 Хүргэлтийн мэдээлэл</div>
      ${row("Нэр", customer || "-")}
      ${row("Утас", safe(order.phone))}
      ${row("Хаяг", address)}
    </div>

    ${viewOrderButton(order.id)}
  `;

  return wrap(content);
}

