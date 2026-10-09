-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "currentMedications" JSONB;
ALTER TABLE "Patient" ADD COLUMN "deletedAt" DATETIME;
