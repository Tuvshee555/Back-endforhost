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

// CORS: allow frontend domain
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3000/home-page", "http://localhost:3001/home-page", "https://your-frontend.vercel.app"],
  methods: ["GET","POST","PUT","DELETE"]
}));

app.use(express.json());

// Routers
app.use("/food", foodRouter);
app.use("/order", orderRouter);
app.use("/user", userRouter);
app.use("/category", categoryRouter);
app.use("/items", items);
app.use("/qpay", qpayRouter);

// Health check
app.get("/", (req, res) => res.send("🚀 Backend Running"));

// Start server
app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
