/*
  Warnings:

  - A unique constraint covering the columns `[gmailMessageId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "gmailMessageId" TEXT;

-- CreateTable
CREATE TABLE "GmailSync" (
    "id" SERIAL NOT NULL,
    "lastHistoryId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastError" TEXT,

    CONSTRAINT "GmailSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_gmailMessageId_key" ON "Order"("gmailMessageId");
