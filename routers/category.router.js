import { Router } from "express";
import { deleteCategories } from "../controller/categories/delete-categories.js";
import { createCategories } from "../controller/categories/create-categories.js";
import { getCategories } from "../controller/categories/get-catagories.js";
import { updateCategories } from "../controller/categories/update-categories.js";
import { getCategoryTree } from "../controller/categories/get-category-tree.js";
import { getCategoryFoodsTree } from "../controller/categories/get-category-foods-tree.js";

export const categoryRouter = Router()

categoryRouter.delete("/",  deleteCategories)
categoryRouter.post("/", createCategories)

categoryRouter.get("/",  getCategories)
categoryRouter.get("/tree", getCategoryTree);

categoryRouter.put("/", updateCategories);

// ⚠ order matters: more specific routes first
categoryRouter.get("/:id/foods-tree", getCategoryFoodsTree);