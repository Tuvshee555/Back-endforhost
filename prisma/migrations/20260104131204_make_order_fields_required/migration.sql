/*
  Warnings:

  - Made the column `orderNumber` on table `FoodOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `paymentMethod` on table `FoodOrder` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FoodOrder" ALTER COLUMN "orderNumber" SET NOT NULL,
ALTER COLUMN "paymentMethod" SET NOT NULL;
