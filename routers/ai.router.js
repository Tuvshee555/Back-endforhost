// src/routers/ai.router.js
import { Router } from "express";
import { aiChat } from "../controller/ai.controller.js";

export const aiRouter = Router();

aiRouter.post("/ai-chat", aiChat);

export default aiRouter;
