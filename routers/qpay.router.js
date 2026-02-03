import express from "express";
import { checkPayment, createInvoice, webhook } from "../controller/qpay/qpay.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import rateLimit from "express-rate-limit";

export const qpayRouter = express.Router();
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

qpayRouter.post("/create", requireAuth, paymentLimiter, createInvoice);
qpayRouter.post("/check", requireAuth, paymentLimiter, checkPayment);
qpayRouter.post("/webhook", webhook);
