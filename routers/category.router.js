import { Router } from "express";
import { deleteCategories } from "../controller/categories/delete-categories.js";
import { createCategories } from "../controller/categories/create-categories.js";
import { getCategories } from "../controller/categories/get-catagories.js";
import { updateCategories } from "../controller/categories/update-categories.js";

export const categoryRouter = Router()

categoryRouter.delete("/",  deleteCategories)
categoryRouter.post("/", createCategories)
categoryRouter.get("/",  getCategories)
categoryRouter.put("/", updateCategories)