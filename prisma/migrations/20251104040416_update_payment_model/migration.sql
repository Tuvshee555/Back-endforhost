-- Step 1: Set default value for existing rows
UPDATE "Payment" SET "status" = 'PENDING' WHERE "status" IS NULL;

-- Step 2: Alter column type safely
ALTER TABLE "Payment" 
  ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;

-- Step 3: Set NOT NULL constraint
ALTER TABLE "Payment" 
  ALTER COLUMN "status" SET NOT NULL;

-- Step 4: Add new columns
ALTER TABLE "Payment" 
  ADD COLUMN IF NOT EXISTS "qrText" TEXT,
  ADD COLUMN IF NOT EXISTS "qrImage" TEXT;

-- Step 5: Add unique constraint on orderId
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");
