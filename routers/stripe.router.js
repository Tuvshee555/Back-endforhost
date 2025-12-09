// routers/stripe.router.js
import { Router } from "express";
import express from "express";
import { createSession } from "../controller/stripe/create-session.js";
import { webhookHandler } from "../controller/stripe/webhook.js";

const stripeRouter = Router();

stripeRouter.post("/create-session", express.json(), createSession);
stripeRouter.post("/webhook", express.raw({ type: "application/json" }), webhookHandler);

export default stripeRouter;
