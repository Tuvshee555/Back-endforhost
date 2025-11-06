import { Router } from "express";
import { createFood } from "../controller/foods/create-food.js";
import { deleteFood } from "../controller/foods/delete-food.js";
import { getFood } from "../controller/foods/get-food.js";
import { updateFood } from "../controller/foods/update-food.js";
import { deleteAllFoods } from "../controller/foods/delete-all-food.js";
import { getFoodById } from "../controller/foods/get-food-by-id.js";

export const foodRouter = Router();

foodRouter.post("/", createFood);
foodRouter.delete("/:id", deleteFood);
foodRouter.get("/", getFood);
foodRouter.put("/:id", updateFood);
foodRouter.delete("/", deleteAllFoods);
foodRouter.get("/:id", getFoodById); 

