import { Router } from "express";
import { createFood } from "../controller/foods/create-food.js";
import { deleteFood } from "../controller/foods/delete-food.js";
import { getFood } from "../controller/foods/get-food.js";
import { updateFood } from "../controller/foods/update-food.js";
import { deleteAllFoods } from "../controller/foods/delete-all-food.js";
import { getFoodById } from "../controller/foods/get-food-by-id.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const foodRouter = Router();

foodRouter.post("/", requireAdmin, createFood);
foodRouter.get("/", getFood);
foodRouter.put("/:id", requireAdmin, updateFood);
foodRouter.get("/:id", getFoodById); 


foodRouter.delete("/", requireAdmin, deleteAllFoods);
foodRouter.delete("/:id", requireAdmin, deleteFood);
