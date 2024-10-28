/*
  Warnings:

  - You are about to drop the column `carrier` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `trackingId` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "carrier",
DROP COLUMN "trackingId";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "trackingId" TEXT;
