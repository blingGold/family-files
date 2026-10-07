-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserPatientAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    CONSTRAINT "UserPatientAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPatientAccess_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "birthDate" DATETIME,
    "bloodType" TEXT,
    "allergies" TEXT,
    "familyHistory" TEXT,
    "chronicTags" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "discoveredDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'FOLLOWING',
    "severity" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Condition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conditionId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "encounterDate" DATETIME NOT NULL,
    "hospital" TEXT,
    "department" TEXT,
    "doctor" TEXT,
    "chiefComplaint" TEXT,
    "diagnosis" TEXT,
    "advice" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Encounter_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "encounterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "resultValue" TEXT,
    "conclusion" TEXT,
    "examDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exam_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "encounterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "purpose" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Medication_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "encounterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "procedureDate" DATETIME,
    "surgeon" TEXT,
    "result" TEXT,
    "hospital" TEXT,
    "admissionDate" DATETIME,
    "dischargeDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Procedure_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conditionId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "items" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "intervalMonths" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedDate" DATETIME,
    "completedEncounterId" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUp_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Insurance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "medicalType" TEXT,
    "enrollRegion" TEXT,
    "reimburseNote" TEXT,
    "insurer" TEXT,
    "productType" TEXT,
    "policyNo" TEXT,
    "coverageAmount" TEXT,
    "coverageScope" TEXT,
    "deductible" TEXT,
    "effectiveDate" DATETIME,
    "expiryDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Insurance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "examId" INTEGER,
    "procedureId" INTEGER,
    "insuranceId" INTEGER,
    CONSTRAINT "Attachment_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "Insurance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserPatientAccess_userId_patientId_key" ON "UserPatientAccess"("userId", "patientId");

-- CreateIndex
CREATE INDEX "Condition_patientId_idx" ON "Condition"("patientId");

-- CreateIndex
CREATE INDEX "Encounter_conditionId_idx" ON "Encounter"("conditionId");

-- CreateIndex
CREATE INDEX "Encounter_patientId_idx" ON "Encounter"("patientId");

-- CreateIndex
CREATE INDEX "Exam_encounterId_idx" ON "Exam"("encounterId");

-- CreateIndex
CREATE INDEX "Medication_encounterId_idx" ON "Medication"("encounterId");

-- CreateIndex
CREATE INDEX "Procedure_encounterId_idx" ON "Procedure"("encounterId");

-- CreateIndex
CREATE INDEX "FollowUp_conditionId_idx" ON "FollowUp"("conditionId");

-- CreateIndex
CREATE INDEX "FollowUp_patientId_dueDate_status_idx" ON "FollowUp"("patientId", "dueDate", "status");

-- CreateIndex
CREATE INDEX "Insurance_patientId_idx" ON "Insurance"("patientId");

-- CreateIndex
CREATE INDEX "Attachment_examId_idx" ON "Attachment"("examId");

-- CreateIndex
CREATE INDEX "Attachment_procedureId_idx" ON "Attachment"("procedureId");

-- CreateIndex
CREATE INDEX "Attachment_insuranceId_idx" ON "Attachment"("insuranceId");
