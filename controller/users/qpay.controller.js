import axios from "axios";
import { prisma } from "../../prismaClient.js";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;

// ✅ Step 1: Get Access Token
async function getAccessToken() {
  const res = await axios.post(
    `${QPAY_BASE_URL}/auth/token`,
    {
      username: process.env.QPAY_USERNAME,
      password: process.env.QPAY_PASSWORD,
    },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data.access_token;
}

// ✅ Step 2: Create Invoice
export const createInvoice = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const token = await getAccessToken();

    const invoiceRes = await axios.post(
      `${QPAY_BASE_URL}/invoice`,
      {
        invoice_code: "DELIVERY_APP_INVOICE",
        sender_invoice_no: orderId,
        invoice_description: `Payment for order ${orderId}`,
        amount,
        callback_url: `${process.env.BACKEND_URL}/qpay/webhook`,
        sender_staff_code: "system",
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Save payment in Prisma
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoiceRes.data.invoice_id,
        orderId,
        amount,
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
    console.error("Create invoice error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create invoice" });
  }
};

// ✅ Step 3: Check Payment
export const checkPayment = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const token = await getAccessToken();

    const statusRes = await axios.post(
      `${QPAY_BASE_URL}/payment/check`,
      { object_type: "INVOICE", object_id: invoiceId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const paid = statusRes.data.paid_amount > 0;
    if (paid) {
      await prisma.payment.updateMany({
        where: { invoiceId },
        data: { status: "PAID" },
      });
    }

    res.json({ paid, data: statusRes.data });
  } catch (err) {
    console.error("Check payment error:", err.response?.data || err.message);
    res.status(500).json({ error: "Check payment failed" });
  }
};

// ✅ Step 4: Webhook for auto update
export const webhook = async (req, res) => {
  console.log("💰 QPay webhook received:", req.body);
  const { object_id, payment_status } = req.body;

  if (payment_status === "PAID") {
    await prisma.payment.updateMany({
      where: { invoiceId: object_id },
      data: { status: "PAID" },
    });
  }

  res.json({ received: true });
};
