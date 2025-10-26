import { Router } from "express";
import { createItems } from "../controller/items/create-items.js";
import { deleteItems } from "../controller/items/delete-items.js";
import { getItems } from "../controller/items/get-items.js";
import { updateItems } from "../controller/items/update-items.js";

export const items = Router()

items.post("/", createItems)
items.delete("/", deleteItems)
items.get("/", getItems)
items.put("/", updateItems)