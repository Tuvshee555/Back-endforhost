import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import { userRouter } from "./routers/user.router.js";
import { foodRouter } from "./routers/food.router.js";
import { categoryRouter } from "./routers/category.router.js";
import { items } from "./routers/items.router.js";
import { qpayRouter } from "./routers/qpay.router.js";
import { orderRouter } from "./routers/order.router.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routers
app.use("/food", foodRouter);
app.use("/order", orderRouter);
app.use("/user", userRouter);
app.use("/category", categoryRouter);
app.use("/items", items);
app.use("/qpay", qpayRouter); // ✅ QPay router

// Health check
app.get("/", (req, res) => res.send("🚀 QPay Backend Running"));

// Start server
app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
console.log("DATABASE_URL:", process.env.DATABASE_URL);

