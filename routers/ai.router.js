// src/routers/ai.router.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { aiChat } from "../controller/ai.controller.js";

export const aiRouter = Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

aiRouter.post("/ai-chat", aiLimiter, aiChat);

export default aiRouter;
