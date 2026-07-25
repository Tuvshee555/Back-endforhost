import axios from "axios";
import { prisma } from "../../prismaClient.js";
import {
  sendTelegramMessage,
  formatOrderStatusMessage,
} from "../../utils/telegram.js";
import crypto from "crypto";

import { sendEmail } from "../../utils/sendEmail.js";
import { paymentConfirmedEmail } from "../../utils/emailTemplates.js";
import { incrementSalesForOrder } from "../../utils/orderPaid.js";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;
const AMOUNT_EPSILON = 0.01;
let cachedToken = null;
let tokenExpiry = null;

const toMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const isAdminRequest = (req) => req.user?.role === "ADMIN";

const canAccessOrder = (req, order) =>
  Boolean(req.user?.id) &&
  (isAdminRequest(req) || order?.userId === req.user.id);

const isPaidEnough = (paidAmount, expectedAmount) =>
  toMoney(paidAmount) + AMOUNT_EPSILON >= toMoney(expectedAmount);

export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const res = await axios.post(
      `${QPAY_BASE_URL}/auth/token`,
      {
        username: process.env.QPAY_USERNAME,
        password: process.env.QPAY_PASSWORD,
      },
      {
        auth: {
          username: process.env.QPAY_USERNAME,
          password: process.env.QPAY_PASSWORD,
        },
        headers: { "Content-Type": "application/json" },
      }
    );

    cachedToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in - 30) * 1000;

    console.log("âœ… New QPay token backend");
    return cachedToken;
  } catch (err) {
    console.error(
      "âŒ Failed to get QPay token:",
      err.response?.data || err.message
    );
    throw err;
  }
}

export const createInvoice = async (req, res) => {
  try {
    const requesterId = req.user?.id;
    const { orderId } = req.body;

    if (!requesterId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id: String(orderId) },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        totalPrice: true,
        paymentMethod: true,
        status: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (order.paymentMethod !== "QPAY") {
      return res.status(400).json({ error: "This order is not configured for QPay" });
    }

    if (!["PENDING", "WAITING_PAYMENT"].includes(order.status)) {
      return res.status(400).json({ error: "This order cannot receive a new invoice" });
    }

    const amount = toMoney(order.totalPrice);
    if (amount <= 0) {
      return res.status(400).json({ error: "Order amount is invalid" });
    }

    await prisma.payment.deleteMany({
      where: { orderId: order.id, status: "PENDING" },
    });

    const token = await getAccessToken();

    const shortId = order.id.replace(/-/g, "").slice(0, 20);
    const timestamp = Date.now().toString().slice(-10);
    const uniqueInvoiceNo = `${shortId}_${timestamp}`;

    const invoiceRes = await axios.post(
      `${QPAY_BASE_URL}/invoice`,
      {
        invoice_code: process.env.QPAY_INVOICE_CODE,
        sender_invoice_no: uniqueInvoiceNo,
        invoice_description: `Payment for order ${order.orderNumber || order.id}`,
        amount,
        callback_url: `${process.env.BACKEND_URL}/qpay/webhook`,
        sender_staff_code: "system",
        invoice_receiver_code: process.env.QPAY_USERNAME,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { qr_text, qr_image, invoice_id } = invoiceRes.data;

    await prisma.payment.create({
      data: {
        invoiceId: invoice_id,
        orderId: order.id,
        amount: Number(amount),
        status: "PENDING",
        qrText: qr_text,
        qrImage: qr_image,
      },
    });

    return res.json({ qr_text, qr_image, invoice_id, amount });
  } catch (err) {
    console.error(
      "âŒ Create invoice error:",
      err.response?.data || err.message
    );
    return res.status(500).json({ error: "Create invoice failed" });
  }
};

export const checkPayment = async (req, res) => {
  try {
    const requesterId = req.user?.id;
    const { invoiceId } = req.body;

    if (!requesterId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!invoiceId) {
      return res.status(400).json({ error: "InvoiceId required" });
    }

    const record = await prisma.payment.findUnique({
      where: { invoiceId },
      select: {
        invoiceId: true,
        orderId: true,
        amount: true,
      },
    });

    if (!record?.orderId) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    const beforeOrder = await prisma.foodOrder.findUnique({
      where: { id: record.orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        orderNumber: true,
        totalPrice: true,
      },
    });

    if (!beforeOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!canAccessOrder(req, beforeOrder)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const token = await getAccessToken();

    const statusRes = await axios.post(
      `${QPAY_BASE_URL}/payment/check`,
      { object_type: "INVOICE", object_id: invoiceId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const paidAmount = toMoney(statusRes.data?.paid_amount || 0);
    const expectedAmount = toMoney(record.amount || beforeOrder.totalPrice);
    const paid = paidAmount > 0 && isPaidEnough(paidAmount, expectedAmount);

    if (!paid) {
      return res.json({
        paid: false,
        underpaid: paidAmount > 0 && !isPaidEnough(paidAmount, expectedAmount),
        expectedAmount,
        paidAmount,
      });
    }

    await prisma.payment.updateMany({
      where: { invoiceId },
      data: { status: "PAID" },
    });

    if (beforeOrder.status === "PAID") {
      return res.json({ paid: true, paidAmount, expectedAmount });
    }

    const updatedOrder = await prisma.foodOrder.update({
      where: { id: record.orderId },
      data: { status: "PAID" },
    });

    // First transition to PAID (guarded above) — count the sale.
    try {
      await incrementSalesForOrder(record.orderId);
    } catch (salesErr) {
      console.error("âŒ Failed to increment salesCount (checkPayment):", salesErr);
    }

    console.log("âœ… Order updated (checkPayment):", updatedOrder.id);

    try {
      await sendTelegramMessage(
        formatOrderStatusMessage(
          updatedOrder,
          beforeOrder.status || "WAITING_PAYMENT",
          "PAID"
        )
      );
    } catch (tgErr) {
      console.error("âŒ Telegram send error (checkPayment):", tgErr);
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: updatedOrder.userId },
        select: { email: true },
      });

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `Payment confirmed #${updatedOrder.orderNumber}`,
          html: paymentConfirmedEmail(updatedOrder),
        });
      }
    } catch (mailErr) {
      console.error("âŒ Email send error (checkPayment):", mailErr);
    }

    return res.json({ paid: true, paidAmount, expectedAmount });
  } catch (err) {
    console.error(
      "âŒ Check payment error:",
      err.response?.data || err.message
    );
    return res.status(500).json({ error: "Check payment failed" });
  }
};

export const webhook = async (req, res) => {
  try {
    console.log("ðŸ”¥ QPay webhook received:", req.body);

    const secret = process.env.QPAY_WEBHOOK_SECRET;
    const signature =
      req.headers["x-qpay-signature"] ||
      req.headers["X-QPAY-Signature"] ||
      req.headers["x-signature"];

    if (secret) {
      if (!req.rawBody) {
        console.error("âœ– Missing rawBody for QPay signature verification");
        return res.status(400).json({ error: "Bad request" });
      }
      const computed = crypto
        .createHmac("sha256", secret)
        .update(req.rawBody)
        .digest("hex");
      const expected = Buffer.from(computed, "utf8");
      const received = Buffer.from(String(signature || ""), "utf8");

      if (
        !signature ||
        expected.length !== received.length ||
        !crypto.timingSafeEqual(expected, received)
      ) {
        console.warn("âœ– Invalid QPay signature");
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const { invoice_id, paid_amount, status } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: "Missing invoice_id" });
    }

    const payment = await prisma.payment.findUnique({
      where: { invoiceId: invoice_id },
      select: {
        invoiceId: true,
        orderId: true,
        amount: true,
      },
    });

    if (!payment?.orderId) {
      console.warn("QPay webhook received for unknown invoice:", invoice_id);
      return res.json({ received: true, skipped: true });
    }

    const beforeOrder = await prisma.foodOrder.findUnique({
      where: { id: payment.orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        orderNumber: true,
        totalPrice: true,
      },
    });

    if (!beforeOrder) {
      console.warn("QPay webhook order not found for invoice:", invoice_id);
      return res.json({ received: true, skipped: true });
    }

    const paidAmount = toMoney(paid_amount || 0);
    const expectedAmount = toMoney(payment.amount || beforeOrder.totalPrice);
    const effectivePaidAmount =
      paidAmount > 0
        ? paidAmount
        : status === "PAID"
        ? expectedAmount
        : 0;
    const isPaid =
      effectivePaidAmount > 0 &&
      isPaidEnough(effectivePaidAmount, expectedAmount);

    if (!isPaid) return res.json({ received: true });

    await prisma.payment.updateMany({
      where: { invoiceId: invoice_id },
      data: { status: "PAID" },
    });

    if (beforeOrder.status === "PAID") {
      return res.json({ received: true });
    }

    const updatedOrder = await prisma.foodOrder.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
    });

    // First transition to PAID (guarded above) — count the sale.
    try {
      await incrementSalesForOrder(payment.orderId);
    } catch (salesErr) {
      console.error("âŒ Failed to increment salesCount (webhook):", salesErr);
    }

    console.log(`âœ… Order ${updatedOrder.id} marked PAID via QPay webhook`);

    try {
      await sendTelegramMessage(
        formatOrderStatusMessage(
          updatedOrder,
          beforeOrder.status || "WAITING_PAYMENT",
          "PAID"
        )
      );
    } catch (tgErr) {
      console.error("âŒ Telegram send error (webhook):", tgErr);
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: updatedOrder.userId },
        select: { email: true },
      });

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `Payment confirmed #${updatedOrder.orderNumber}`,
          html: paymentConfirmedEmail(updatedOrder),
        });
      }
    } catch (mailErr) {
      console.error("âŒ Email send error (webhook):", mailErr);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("âŒ Webhook error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Webhook failed" });
  }
};
