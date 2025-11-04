-- Step 1: Make sure existing status values are valid
UPDATE "Payment" SET "status" = 'PENDING' WHERE "status" IS NULL;

-- Step 2: Alter status column to TEXT
ALTER TABLE "Payment" 
  ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;

-- Step 3: Set NOT NULL constraint on status
ALTER TABLE "Payment" 
  ALTER COLUMN "status" SET NOT NULL;

-- Step 4: Add qrText and qrImage columns if not exist
ALTER TABLE "Payment" 
  ADD COLUMN IF NOT EXISTS "qrText" TEXT,
  ADD COLUMN IF NOT EXISTS "qrImage" TEXT;

-- Step 5: Add unique constraint on orderId
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");
