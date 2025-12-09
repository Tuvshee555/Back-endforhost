// routers/stripe.router.js
import { Router } from "express";
import express from "express";
import { createSession } from "../controller/stripe/create-session.js";
import { webhookHandler } from "../controller/stripe/webhook.js";

const stripeRouter = Router();

// Parse JSON only for this route so req.body is available
stripeRouter.post("/create-session", express.json(), createSession);

// Keep raw body for the webhook route (required by Stripe)
stripeRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler
);

export default stripeRouter;
