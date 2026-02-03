// routers/stripe.router.js
import { Router } from "express";
import express from "express";
import { createSession } from "../controller/stripe/create-session.js";
import { webhookHandler } from "../controller/stripe/webhook.js";
import { requireAuth } from "../middleware/requireAuth.js";
import rateLimit from "express-rate-limit";

const stripeRouter = Router();

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

stripeRouter.post("/create-session", requireAuth, paymentLimiter, express.json(), createSession);
stripeRouter.post("/webhook", express.raw({ type: "application/json" }), webhookHandler);

export default stripeRouter;
