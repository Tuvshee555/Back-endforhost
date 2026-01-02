import { Router } from "express";
import { createFoodOrder } from "../controller/orders/create-orders.js";
import { deleteFoodOrder } from "../controller/orders/delete-orders.js";
import { getOrdersByUser } from "../controller/orders/get-orders-by-user.js";
import { getOrderById } from "../controller/orders/get-order-by-id.js";
import { updatedFoodOrder } from "../controller/orders/update-orders.js";
import { getAllOrder } from "../controller/orders/all-order.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const orderRouter = Router();

orderRouter.post("/", requireAuth, createFoodOrder);
orderRouter.delete("/", requireAuth, deleteFoodOrder);

orderRouter.get("/user/:userId", requireAuth, getOrdersByUser);
orderRouter.get("/:id", requireAuth, getOrderById);

orderRouter.patch("/:id", requireAuth, updatedFoodOrder);
orderRouter.get("/", requireAuth, getAllOrder);
