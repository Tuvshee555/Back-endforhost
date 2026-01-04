/*
  Warnings:

  - You are about to drop the column `location` on the `FoodOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FoodOrder" DROP COLUMN "location",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "khoroo" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
