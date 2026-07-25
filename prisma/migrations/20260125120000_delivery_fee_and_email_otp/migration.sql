-- Add delivery fee + zone to orders (revenue fix: delivery fee is now persisted and charged)
ALTER TABLE "FoodOrder" ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FoodOrder" ADD COLUMN "deliveryZone" TEXT;

-- Persistent, rate-limitable email OTP store (replaces in-memory Map)
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailOtp_email_key" ON "EmailOtp"("email");
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");
