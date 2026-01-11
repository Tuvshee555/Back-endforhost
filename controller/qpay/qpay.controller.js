import axios from "axios";
import { prisma } from "../../prismaClient.js";
import {
  sendTelegramMessage,
  formatOrderStatusMessage,
} from "../../utils/telegram.js";

import { sendEmail } from "../../utils/sendEmail.js";
import { paymentConfirmedEmail } from "../../utils/emailTemplates.js";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;
let cachedToken = null;
let tokenExpiry = null;

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

    console.log("✅ New QPay token backend");
    return cachedToken;
  } catch (err) {
    console.error(
      "❌ Failed to get QPay token:",
      err.response?.data || err.message
    );
    throw err;
  }
}

export const createInvoice = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid orderId or amount" });
    }

    await prisma.payment.deleteMany({ where: { orderId } });

    const token = await getAccessToken();

    const shortId = orderId.replace(/-/g, "").slice(0, 20);
    const timestamp = Date.now().toString().slice(-10);
    const uniqueInvoiceNo = `${shortId}_${timestamp}`;

    const invoiceRes = await axios.post(
      `${QPAY_BASE_URL}/invoice`,
      {
        invoice_code: process.env.QPAY_INVOICE_CODE,
        sender_invoice_no: uniqueInvoiceNo,
        invoice_description: `Payment for order ${orderId}`,
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
        orderId,
        amount: Number(amount),
        status: "PENDING",
        qrText: qr_text,
        qrImage: qr_image,
      },
    });

    return res.json({ qr_text, qr_image, invoice_id });
  } catch (err) {
    console.error(
      "❌ Create invoice error:",
      err.response?.data || err.message
    );
    return res.status(500).json({ error: "Create invoice failed" });
  }
};

// ✅ Manual check
export const checkPayment = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: "InvoiceId required" });
    }

    const token = await getAccessToken();

    const statusRes = await axios.post(
      `${QPAY_BASE_URL}/payment/check`,
      { object_type: "INVOICE", object_id: invoiceId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const paid = Number(statusRes.data?.paid_amount || 0) > 0;

    if (!paid) return res.json({ paid: false });

    await prisma.payment.updateMany({
      where: { invoiceId },
      data: { status: "PAID" },
    });

    const record = await prisma.payment.findUnique({
      where: { invoiceId },
    });

    if (!record?.orderId) return res.json({ paid: true });

    // order before update
    const beforeOrder = await prisma.foodOrder.findUnique({
      where: { id: record.orderId },
    });

    // ✅ already paid → no duplicate notifications
    if (beforeOrder?.status === "PAID") {
      return res.json({ paid: true });
    }

    // update order
    const updatedOrder = await prisma.foodOrder.update({
      where: { id: record.orderId },
      data: { status: "PAID" },
    });

    console.log("✅ Order updated (checkPayment):", updatedOrder.id);

    // ✅ Telegram notify
    try {
      await sendTelegramMessage(
        formatOrderStatusMessage(
          updatedOrder,
          beforeOrder?.status || "WAITING_PAYMENT",
          "PAID"
        )
      );
    } catch (tgErr) {
      console.error("❌ Telegram send error (checkPayment):", tgErr);
    }

    // ✅ Customer email notify
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
      console.error("❌ Email send error (checkPayment):", mailErr);
    }

    return res.json({ paid: true });
  } catch (err) {
    console.error(
      "❌ Check payment error:",
      err.response?.data || err.message
    );
    return res.status(500).json({ error: "Check payment failed" });
  }
};

// ✅ Webhook (authoritative)
export const webhook = async (req, res) => {
  try {
    console.log("🔥 QPay webhook received:", req.body);

    const { invoice_id, paid_amount, status } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: "Missing invoice_id" });
    }

    const isPaid = Number(paid_amount || 0) > 0 || status === "PAID";
    if (!isPaid) return res.json({ received: true });

    await prisma.payment.updateMany({
      where: { invoiceId: invoice_id },
      data: { status: "PAID" },
    });

    const payment = await prisma.payment.findUnique({
      where: { invoiceId: invoice_id },
    });

    if (!payment?.orderId) return res.json({ received: true });

    const beforeOrder = await prisma.foodOrder.findUnique({
      where: { id: payment.orderId },
    });

    // ✅ already paid → no duplicate notifications
    if (beforeOrder?.status === "PAID") {
      return res.json({ received: true });
    }

    const updatedOrder = await prisma.foodOrder.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
    });

    console.log(`✅ Order ${updatedOrder.id} marked PAID via QPay webhook`);

    // ✅ Telegram notify
    try {
      await sendTelegramMessage(
        formatOrderStatusMessage(
          updatedOrder,
          beforeOrder?.status || "WAITING_PAYMENT",
          "PAID"
        )
      );
    } catch (tgErr) {
      console.error("❌ Telegram send error (webhook):", tgErr);
    }

    // ✅ Customer email notify
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
      console.error("❌ Email send error (webhook):", mailErr);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Webhook failed" });
  }
};
