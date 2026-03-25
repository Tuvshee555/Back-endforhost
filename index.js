// at top of file
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
import lemonWebhookRouter from "./routers/lemonWebhook.router.js";
import lemonRouter from "./routers/lemon.router.js";
import { reviewRouter } from "./routers/review.router.js";
import aiRouter from "./routers/ai.router.js";
import { connectPrismaWithRetry } from "./utils/prisma.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/* ---------------- REQUIRED ENV CHECKS ---------------- */
if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET. Set it in your environment.");
  process.exit(1);
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn("Warning: STRIPE_WEBHOOK_SECRET not set. Stripe webhooks will fail verification.");
}
if (!process.env.QPAY_WEBHOOK_SECRET) {
  console.warn("Warning: QPAY_WEBHOOK_SECRET not set. QPay webhook signatures will not be verified.");
}
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

/* ---------------- STRIPE ROUTES FIRST (raw body) ---------------- */
app.use("/stripe", stripeRouter);

/* ---------------- BODY PARSERS ---------------- */
/* JSON with raw buffer capture for webhook verification */
app.use(express.json({
  limit: "10mb",
  verify: (req, res, buf) => {
    // store raw buffer for webhook signature verification
    req.rawBody = buf;
  },
}));

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
app.use("/upload", uploadRouter);
app.use("/review", reviewRouter);
app.use("/ai", aiRouter);


/* lemon checkout route (create checkout) */
app.use("/payment/lemon", lemonRouter);

/* webhook receiver (rawBody available via req.rawBody) */
app.use("/webhook/lemon-squeezy", lemonWebhookRouter);

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ message: "Internal server error" });
});

/* ---------------- SERVER ---------------- */
const startServer = async () => {
  try {
    await connectPrismaWithRetry();
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Expire unpaid QPay orders every 5 minutes only after DB is ready.
    setInterval(expireUnpaidOrders, 5 * 60 * 1000);
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL.");
    console.error(
      "Check DATABASE_URL in .env and make sure it matches the current Render database URL."
    );
    console.error(
      "If you are running locally, use the External Database URL from Render. If this backend is deployed on Render, use the Internal Database URL."
    );
    console.error("Startup error:", error.message);
    process.exit(1);
  }
};

startServer();
