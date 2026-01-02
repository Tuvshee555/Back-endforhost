import { Router } from "express";
import { createFoodOrder } from "../controller/orders/create-orders.js";
import { deleteFoodOrder } from "../controller/orders/delete-orders.js";
import { getOrdersByUser } from "../controller/orders/get-orders-by-user.js";
import { getOrderById } from "../controller/orders/get-order-by-id.js";
import { updatedFoodOrder } from "../controller/orders/update-orders.js";
import { getAllOrder } from "../controller/orders/all-order.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const orderRouter = Router();

orderRouter.post("/",requireAuth, createFoodOrder);
orderRouter.delete("/", deleteFoodOrder);

// NEW CLEAN ROUTES
orderRouter.get("/:id", getOrderById);         // GET order by ID
orderRouter.get("/user/:userId", getOrdersByUser); // GET orders for user

orderRouter.patch("/:id", updatedFoodOrder);
orderRouter.get("/", getAllOrder);
