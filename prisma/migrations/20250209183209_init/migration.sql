-- CreateEnum
CREATE TYPE "stockLevel" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "internalSKU" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "level" "stockLevel" NOT NULL,
    "locating" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "vendorSKU" INTEGER NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);
