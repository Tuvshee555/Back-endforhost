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

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET. Set it in your environment.");
  process.exit(1);
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn("Warning: STRIPE_WEBHOOK_SECRET not set. Stripe webhooks will fail verification.");
}

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

app.use("/stripe", stripeRouter);

app.use(express.json({
  limit: "10mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res) => {
  res.send("ðŸš€ Backend Running");
});

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

app.use("/payment/lemon", lemonRouter);
app.use("/webhook/lemon-squeezy", lemonWebhookRouter);

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  try {
    await connectPrismaWithRetry();
    console.log("âœ… Database connected");

    app.listen(PORT, () => {
      console.log(`ðŸš€ Server running on port ${PORT}`);
    });

    setInterval(expireUnpaidOrders, 5 * 60 * 1000);
  } catch (error) {
    console.error("âŒ Failed to connect to PostgreSQL.");
    console.error(
      "Check DATABASE_URL in .env and make sure it matches your current PostgreSQL provider."
    );
    console.error(
      "If you are using Neon or another hosted Postgres provider, verify the host, password, database name, and SSL settings."
    );
    console.error("Startup error:", error.message);
    process.exit(1);
  }
};

startServer();
