import express from "express";
import { createInvoice, checkPayment, webhook } from "../controller/users/qpay.controller.js";

export const qpayRouter = express.Router();

qpayRouter.post("/create", createInvoice);   // Create invoice & QR
qpayRouter.post("/check", checkPayment);     // Check invoice status
qpayRouter.post("/webhook", webhook);        // QPay webhook callback

// Optional route for testing
qpayRouter.get("/", (req, res) => {
  res.json({ message: "QPay route connected ✅" });
});
