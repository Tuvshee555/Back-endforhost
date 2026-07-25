import express from "express";
import rateLimit from "express-rate-limit";
import { sendOtp } from "../controller/email/send-opt.js";
import { verifyOtp } from "../controller/email/verify-opt.js";

export const emailRouter = express.Router();

// Throttle OTP requests/guesses per IP to stop brute-force / email spam.
const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 codes per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу." },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 verify attempts per 15 min per IP (per-code lockout is separate)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу." },
});

emailRouter.post("/send-otp", sendOtpLimiter, sendOtp);
emailRouter.post("/verify-otp", verifyOtpLimiter, verifyOtp);
