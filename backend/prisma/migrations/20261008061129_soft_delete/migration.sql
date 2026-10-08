-- AlterTable
ALTER TABLE "Condition" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN "deletedAt" DATETIME;
