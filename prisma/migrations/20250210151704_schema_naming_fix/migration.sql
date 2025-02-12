/*
  Warnings:

  - The `level` column on the `Item` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StockLevel" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "level",
ADD COLUMN     "level" "StockLevel";

-- DropEnum
DROP TYPE "stockLevel";
