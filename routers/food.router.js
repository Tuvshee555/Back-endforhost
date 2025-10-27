import { Router } from "express";
import { createFood } from "../controller/foods/create-food.js";
import { deleteFood } from "../controller/foods/delete-food.js";
import { getFood } from "../controller/foods/get-food.js";
import { updateFood } from "../controller/foods/update-food.js";

export const foodRouter = Router();

foodRouter.post("/", createFood);
foodRouter.delete("/:_id", deleteFood);
foodRouter.get("/", getFood);
foodRouter.put("/", updateFood);
