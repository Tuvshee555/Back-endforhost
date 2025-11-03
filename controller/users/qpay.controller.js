import axios from "axios";
import { prisma } from "../../prismaClient.js";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;
let cachedToken = null;
let tokenExpiry = null;

// ✅ Get Access Token (QPay)
export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    console.log("✅ Using cached token");
    return cachedToken;
  }

  try {
    const body = {
      username: process.env.QPAY_USERNAME,
      password: process.env.QPAY_PASSWORD,
    };

    // 🔥 Some QPay sandbox servers require both Basic Auth AND body
    const res = await axios.post(`${QPAY_BASE_URL}/auth/token`, body, {
      auth: {
        username: process.env.QPAY_USERNAME,
        password: process.env.QPAY_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
      },
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

// ✅ Create invoice
export const createInvoice = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount)
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

    const { qr_text, qr_image, invoice_id } = invoiceRes.data;

    // Save to DB (optional)
    await prisma.payment.create({
      data: { invoiceId: invoice_id, orderId, amount: Number(amount), status: "PENDING" },
    });

    res.json({ qr_text, qr_image, invoice_id });
  } catch (err) {
    console.error("❌ Create invoice error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
};

// ✅ Check payment status
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

// ✅ Webhook (optional)
export const webhook = async (req, res) => {
  try {
    console.log("Webhook received:", req.body);
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: "Webhook failed" });
  }
};

