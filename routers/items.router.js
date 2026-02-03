import { Router } from "express";
import { createItems } from "../controller/items/create-items.js";
import { deleteItems } from "../controller/items/delete-items.js";
import { getItems } from "../controller/items/get-items.js";
import { updateItems } from "../controller/items/update-items.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const items = Router()

items.post("/", requireAdmin, createItems)
items.delete("/", requireAdmin, deleteItems)
items.get("/", requireAdmin, getItems)
items.put("/", requireAdmin, updateItems)
