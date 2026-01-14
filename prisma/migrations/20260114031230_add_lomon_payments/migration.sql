-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'LEMON';

-- CreateTable
CREATE TABLE "LemonPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "checkoutId" TEXT,
    "lemonOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LemonPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LemonPayment_orderId_key" ON "LemonPayment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "LemonPayment_lemonOrderId_key" ON "LemonPayment"("lemonOrderId");

-- AddForeignKey
ALTER TABLE "LemonPayment" ADD CONSTRAINT "LemonPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FoodOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
