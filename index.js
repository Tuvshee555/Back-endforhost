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
import { emailRouter } from "./routers/email.routes.js";
import stripeRouter from "./routers/stripe.router.js";
import uploadRouter from "./routers/upload.router.js";
import { expireUnpaidOrders } from "./jobs/expireOrders.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/* ---------------- CORS ---------------- */
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
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

/* ---------------- BODY PARSERS ---------------- */
/* JSON only for normal APIs */
app.use(express.json({ limit: "10mb" }));

/* REQUIRED for multipart/form-data (multer) */
app.use(express.urlencoded({ extended: true }));

/* ---------------- HEALTH ---------------- */
app.get("/", (_, res) => {
  res.send("🚀 Backend Running");
});

/* ---------------- ROUTES ---------------- */
app.use("/food", foodRouter);
app.use("/order", orderRouter);
app.use("/user", userRouter);
app.use("/category", categoryRouter);
app.use("/items", items);
app.use("/qpay", qpayRouter);
app.use("/stats", statRouter);
app.use("/email", emailRouter);
app.use("/stripe", stripeRouter);

/* 🔥 MEDIA UPLOAD (ADMIN ONLY) */
app.use("/upload", uploadRouter);

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ message: "Internal server error" });
});

/* ---------------- SERVER ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

/* ---------------- CRON ---------------- */
// ⏳ Expire unpaid QPay orders every 5 minutes
setInterval(expireUnpaidOrders, 5 * 60 * 1000);
