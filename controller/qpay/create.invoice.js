import { prisma } from "../../prismaClient";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;

export const createInvoice = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount || amount <= 0)
      return res.status(400).json({ error: "Invalid orderId or amount" });

    // ---------------------------
    // ✅ RETURN EXISTING INVOICE
    // ---------------------------
    const existing = await prisma.payment.findFirst({ where: { orderId } });

    if (existing) {
      return res.json({
        qr_text: existing.qrText,
        invoice_id: existing.invoiceId,
      });
    }

    // ---------------------------
    // 🔥 Create NEW Invoice
    // ---------------------------
    const token = await getAccessToken();

    const uniqueInvoiceNo = `${orderId}_${Date.now()}`;

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

    res.json({ qr_text, qr_image, invoice_id });
  } catch (err) {
    console.error("❌ Create invoice error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
};