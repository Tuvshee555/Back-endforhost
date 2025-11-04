import express from "express";
import { getPaymentsStats, getRevenueStats } from "../controller/revenue/stats.controller.js";

export const statRouter = express.Router();

statRouter.get("/revenue", getRevenueStats);
statRouter.get("/payments", getPaymentsStats);
