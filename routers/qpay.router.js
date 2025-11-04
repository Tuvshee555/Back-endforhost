import express from "express";
import { checkPayment, createInvoice, webhook } from "../controller/qpay/qpay.controller.js";

export const qpayRouter = express.Router();
qpayRouter.post("/create", createInvoice);
qpayRouter.post("/check", checkPayment);
qpayRouter.post("/webhook", webhook);
