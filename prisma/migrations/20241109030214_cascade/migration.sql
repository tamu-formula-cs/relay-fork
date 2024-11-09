-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_receiptOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_supportingOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_orderId_fkey";

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_supportingOrderId_fkey" FOREIGN KEY ("supportingOrderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_receiptOrderId_fkey" FOREIGN KEY ("receiptOrderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
