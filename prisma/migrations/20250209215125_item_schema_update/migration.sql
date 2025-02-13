/*
  Warnings:

  - You are about to drop the column `vendorItemId` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "vendorItemId",
ADD COLUMN     "internalSKU" INTEGER,
ADD COLUMN     "vendorSKU" TEXT;
