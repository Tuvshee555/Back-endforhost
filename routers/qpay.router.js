import express from "express";
import { createInvoice, checkPayment, webhook } from "../controller/users/qpay.controller.js";

export const qpayRouter = express.Router();
qpayRouter.post("/create", createInvoice);
qpayRouter.post("/check", checkPayment);
qpayRouter.post("/webhook", webhook);
