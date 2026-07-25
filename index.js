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
import { cleanupGuestUsers } from "./jobs/cleanupGuests.js";
import lemonWebhookRouter from "./routers/lemonWebhook.router.js";
import lemonRouter from "./routers/lemon.router.js";
import { reviewRouter } from "./routers/review.router.js";
import aiRouter from "./routers/ai.router.js";
import { connectPrismaWithRetry } from "./utils/prisma.js";

dotenv.config();

// Optional hardening/perf middleware, loaded defensively so the server still
// boots if the deps aren't installed yet (run `npm install` to enable them).
let compression = null;
let helmet = null;
try {
  ({ default: compression } = await import("compression"));
} catch {
  console.warn("compression not installed — run `npm install` to enable gzip.");
}
try {
  ({ default: helmet } = await import("helmet"));
} catch {
  console.warn("helmet not installed — run `npm install` to enable security headers.");
}

const app = express();
const PORT = process.env.PORT || 4000;

if (helmet) {
  // JSON API consumed cross-origin by the storefront/admin: keep the safe
  // headers but disable the policies that would block those cross-origin apps.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
}

if (compression) {
  app.use(compression());
}

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

    // Purge stale guest accounts once a day (and shortly after boot).
    setTimeout(cleanupGuestUsers, 60 * 1000);
    setInterval(cleanupGuestUsers, 24 * 60 * 60 * 1000);
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
