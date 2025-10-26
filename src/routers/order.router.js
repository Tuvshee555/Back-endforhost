import { Router } from "express";
import { createFoodOrder } from "../controller/orders/create-orders.js";
import { deleteFoodOrder } from "../controller/orders/delete-orders.js";
import { getFoodOrder } from "../controller/orders/get-orders.js";
import { updatedFoodOrder } from "../controller/orders/update-orders.js";
import { validateFoodOrder } from "../middleware/users/validate-orders.js";
import { getAllOrder } from "../controller/orders/all-order.js";

export const orderRouter = Router();
orderRouter.post("/", createFoodOrder);
orderRouter.delete("/", validateFoodOrder, deleteFoodOrder);
orderRouter.get("/:_id", getFoodOrder);
orderRouter.patch("/:_id", updatedFoodOrder);

orderRouter.get("/", getAllOrder);
