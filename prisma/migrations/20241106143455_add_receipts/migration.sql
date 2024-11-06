/*
  Warnings:

  - You are about to drop the column `orderId` on the `Document` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_orderId_fkey";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "orderId",
ADD COLUMN     "receiptOrderId" INTEGER,
ADD COLUMN     "supportingOrderId" INTEGER;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_supportingOrderId_fkey" FOREIGN KEY ("supportingOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_receiptOrderId_fkey" FOREIGN KEY ("receiptOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
