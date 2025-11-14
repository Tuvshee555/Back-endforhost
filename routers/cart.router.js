import { Router } from "express";

import { getCart } from "../controller/cart/get-cart.js";
import { addCart } from "../controller/cart/add-cart.js";
import { updateCart } from "../controller/cart/update-cart.js";
import { removeCart } from "../controller/cart/remove-cart.js";
import { clearCart } from "../controller/cart/clear-cart.js";

export const cartRouter = Router();

cartRouter.get("/:userId", getCart);
cartRouter.post("/add", addCart);
cartRouter.post("/update", updateCart);
cartRouter.post("/remove", removeCart);
cartRouter.post("/clear", clearCart);
