import axios from "axios";
import { prisma } from "../../prismaClient.js";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;

let cachedToken = null;
let tokenExpiry = null;

// Fetch QPay Access Token
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await axios.post(
    `${QPAY_BASE_URL}/auth/token`,
    {},
    {
      auth: {
        username: process.env.QPAY_USERNAME,
        password: process.env.QPAY_PASSWORD,
      },
      headers: { "Content-Type": "application/json" },
    }
  );

  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 30) * 1000; // 30s buffer
  return cachedToken;
}

// Create invoice
export const createInvoice = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount || amount <= 0)
      return res.status(400).json({ error: "Invalid orderId or amount" });

    const token = await getAccessToken();

    const invoiceRes = await axios.post(
      `${QPAY_BASE_URL}/invoice`,
      {
        invoice_code: process.env.QPAY_INVOICE_CODE,
        sender_invoice_no: orderId,
        invoice_description: `Payment for order ${orderId}`,
        amount,
        callback_url: `${process.env.BACKEND_URL}/qpay/webhook`,
        sender_staff_code: "system",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!invoiceRes.data || !invoiceRes.data.invoice_id)
      return res.status(500).json({ error: "Invoice creation failed" });

    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoiceRes.data.invoice_id,
        orderId,
        amount: Number(amount),
        status: "PENDING",
      },
    });

    res.json({
      qr_image: invoiceRes.data.qr_image,
      qr_text: invoiceRes.data.qr_text,
      invoice_id: invoiceRes.data.invoice_id,
      payment,
    });
  } catch (err) {
    console.error("❌ Create invoice error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
};

// Check payment
export const checkPayment = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ error: "InvoiceId required" });

    const token = await getAccessToken();

    const statusRes = await axios.post(
      `${QPAY_BASE_URL}/payment/check`,
      { object_type: "INVOICE", object_id: invoiceId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const paid = statusRes.data.paid_amount > 0;
    if (paid) {
      await prisma.payment.update({
        where: { invoiceId },
        data: { status: "PAID" },
      });
    }

    res.json({ paid, data: statusRes.data });
  } catch (err) {
    console.error("❌ Check payment error:", err.response?.data || err.message);
    res.status(500).json({ error: "Check payment failed" });
  }
};

// Webhook for QPay callback
export const webhook = async (req, res) => {
  try {
    const { object_id, payment_status } = req.body;
    if (!object_id) return res.status(400).json({ error: "InvoiceId missing" });

    const payment = await prisma.payment.findUnique({ where: { invoiceId: object_id } });
    if (!payment) return res.status(400).json({ error: "Invalid invoice" });

    if (payment_status === "PAID") {
      await prisma.payment.update({
        where: { invoiceId: object_id },
        data: { status: "PAID" },
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: "Webhook failed" });
  }
};
