import { prisma } from "../../prismaClient";

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
