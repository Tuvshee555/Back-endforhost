import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import { userRouter } from "./routers/user.router.js";
import { foodRouter } from "./routers/food.router.js";
import { categoryRouter } from "./routers/category.router.js";
import { items } from "./routers/items.router.js";
import { qpayRouter } from "./routers/qpay.router.js";
import { orderRouter } from "./routers/order.router.js";
import { statRouter } from "./routers/stat.router.js";
import { cartRouter } from "./routers/cart.router.js";
import { emailRouter } from "./routers/email.routes.js";
import stripeRouter from "./routers/stripe.router.js";

dotenv.config();

const app = express();  
const PORT = process.env.PORT || 4000;


// CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://food-delivery-customer.vercel.app",
      "https://food-delivery-admin-peach.vercel.app",
      "https://food-delivery-admin-z918.vercel.app",
      "https://delivery-customer.shop",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
    credentials: true,
  })
);

// ✅ VERY IMPORTANT
app.options("*", cors());

app.use(express.json());

// Routers
app.use("/food", foodRouter);
app.use("/order", orderRouter);
app.use("/user", userRouter);
app.use("/category", categoryRouter);
app.use("/items", items);
app.use("/qpay", qpayRouter);
app.use("/stats", statRouter);
app.use("/cart", cartRouter);
app.use("/email", emailRouter);
app.use("/stripe", stripeRouter);



// Health check
app.get("/", (req, res) => res.send("🚀 Backend Running"));

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

