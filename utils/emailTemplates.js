export function orderCreatedEmail(order) {
  const items =
    order.foodOrderItems?.length > 0
      ? order.foodOrderItems
          .map((it) => `<li>${it.food?.foodName ?? "Food"} x${it.quantity}</li>`)
          .join("")
      : "<li>No items</li>";

  return `
    <div style="font-family:Arial,sans-serif">
      <h2>✅ Order received</h2>
      <p><b>Order:</b> #${order.orderNumber}</p>
      <p><b>Total:</b> ${Number(order.totalPrice).toLocaleString()}₮</p>
      <p><b>Payment:</b> ${order.paymentMethod}</p>
      <p><b>Status:</b> ${order.status}</p>
      <h3>Items</h3>
      <ul>${items}</ul>
    </div>
  `;
}

export function paymentConfirmedEmail(order) {
  return `
    <div style="font-family:Arial,sans-serif">
      <h2>✅ Payment confirmed</h2>
      <p><b>Order:</b> #${order.orderNumber}</p>
      <p><b>Total:</b> ${Number(order.totalPrice).toLocaleString()}₮</p>
      <p><b>Payment:</b> ${order.paymentMethod}</p>
      <p><b>Status:</b> PAID</p>
    </div>
  `;
}
