/*
  Warnings:

  - You are about to drop the `Inventory` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "level" "stockLevel",
ADD COLUMN     "location" TEXT,
ADD COLUMN     "vendorItemId" TEXT;

-- DropTable
DROP TABLE "Inventory";
