/*
  Warnings:

  - You are about to drop the column `aiAgreement` on the `AnalysisHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AnalysisHistory" DROP COLUMN "aiAgreement",
ADD COLUMN     "documentSource" TEXT;
