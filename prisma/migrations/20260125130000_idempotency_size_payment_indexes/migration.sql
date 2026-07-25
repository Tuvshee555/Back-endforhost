-- Order idempotency: prevents duplicate orders from double-clicks / retries
ALTER TABLE "FoodOrder" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "FoodOrder_idempotencyKey_key" ON "FoodOrder"("idempotencyKey");

-- Persist the selected size/variant on each order line (was dropped at checkout)
ALTER TABLE "OrderItem" ADD COLUMN "size" TEXT;

-- Speed up revenue/payment stats queries (Payment had no indexes)
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
