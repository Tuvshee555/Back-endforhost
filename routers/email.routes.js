import express from "express";
import { sendOtp } from "../controller/email/send-opt.js";
import { verifyOtp } from "../controller/email/verify-opt.js";

export const emailRouter = express.Router();

emailRouter.post("/send-otp", sendOtp);
emailRouter.post("/verify-otp", verifyOtp);

