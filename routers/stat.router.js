import express from "express";
import { getPaymentsStats, getRevenueStats } from "../controller/revenue/stats.controller.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const statRouter = express.Router();

statRouter.get("/revenue", requireAdmin, getRevenueStats);
statRouter.get("/payments", requireAdmin, getPaymentsStats);
