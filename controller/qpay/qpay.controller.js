import axios from "axios";
import { prisma } from "../../prismaClient.js"; // only import prisma client

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;
let cachedToken = null;
let tokenExpiry = null;

// ✅ Get Access Token (QPay)
export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const body = {
      username: process.env.QPAY_USERNAME,
      password: process.env.QPAY_PASSWORD,
    };

    const res = await axios.post(`${QPAY_BASE_URL}/auth/token`, body, {
      auth: {
        username: process.env.QPAY_USERNAME,
        password: process.env.QPAY_PASSWORD,
      },
      headers: { "Content-Type": "application/json" },
    });

    cachedToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in - 30) * 1000;

    console.log("✅ New QPay token backend:", cachedToken);
    return cachedToken;
  } catch (err) {
    console.error("❌ Failed to get QPay token:", err.response?.data || err.message);
    throw err;
  }
}

// ✅ Create invoice (one-time use only)
export const createInvoice = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount || amount <= 0)
      return res.status(400).json({ error: "Invalid orderId or amount" });

    // Remove ALL existing payments for this order
    await prisma.payment.deleteMany({ where: { orderId } });

    const token = await getAccessToken();

    // Create short invoice number
    const shortId = orderId.replace(/-/g, "").slice(0, 20);
    const timestamp = Date.now().toString().slice(-10);
    const uniqueInvoiceNo = `${shortId}_${timestamp}`;

    console.log("📌 QPAY sender_invoice_no:", uniqueInvoiceNo);

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
    console.error("❌ Create invoice error:", err.response?.data || err.message);
    return res.status(500).json({ error: err.response?.data || err.message });
  }
};



// ✅ Check payment status manually
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

    res.json({ paid });
  } catch (err) {
    console.error("❌ Check payment error:", err.response?.data || err.message);
    res.status(500).json({ error: "Check payment failed" });
  }
};

// ✅ Webhook to auto-update payment
export const webhook = async (req, res) => {
  try {
    const { invoice_id, paid_amount, status } = req.body;

    // Mark invoice as PAID automatically if paid_amount > 0
    if (paid_amount > 0 || status === "PAID") {
      await prisma.payment.updateMany({
        where: { invoiceId: invoice_id, status: "PENDING" },
        data: { status: "PAID" },
      });
      console.log(`✅ Invoice ${invoice_id} marked as PAID via webhook`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: "Webhook failed" });
  }
};
