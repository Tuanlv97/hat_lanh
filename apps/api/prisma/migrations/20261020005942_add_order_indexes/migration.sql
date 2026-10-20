-- CreateIndex
CREATE INDEX "Order_completedAt_idx" ON "Order"("completedAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");
