import { Router } from "express";
import express from "express";
import { createSession } from "../controller/stripe/create-session.js";
import { webhookHandler } from "../controller/stripe/webhook.js";

const stripeRouter = Router();

// Create Checkout Session
stripeRouter.post("/create-session", createSession);

// ⚠️ RAW BODY IS REQUIRED FOR WEBHOOK
stripeRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler
);

export default stripeRouter;
