/*
  Warnings:

  - A unique constraint covering the columns `[orderNumber]` on the table `FoodOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK', 'QPAY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'WAITING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE 'COD_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE 'PAID';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERING';

-- AlterTable
ALTER TABLE "FoodOrder" ADD COLUMN     "orderNumber" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "FoodOrder_orderNumber_key" ON "FoodOrder"("orderNumber");
