import { Router } from "express";
import { deleteCategories } from "../controller/categories/delete-categories.js";
import { createCategories } from "../controller/categories/create-categories.js";
import { getCategories } from "../controller/categories/get-catagories.js";
import { updateCategories } from "../controller/categories/update-categories.js";
import { getCategoryTree } from "../controller/categories/get-category-tree.js";
import { getCategoryFoodsTree } from "../controller/categories/get-category-foods-tree.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { publicCache } from "../middleware/publicCache.js";

export const categoryRouter = Router()

categoryRouter.delete("/", requireAdmin, deleteCategories)
categoryRouter.post("/", requireAdmin, createCategories)

categoryRouter.get("/", publicCache(), getCategories)
categoryRouter.get("/tree", publicCache(), getCategoryTree);

categoryRouter.put("/", requireAdmin, updateCategories);

// ⚠ order matters: more specific routes first
categoryRouter.get("/:id/foods-tree", publicCache(), getCategoryFoodsTree);
