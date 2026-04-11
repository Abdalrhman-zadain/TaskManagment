-- Add Public Relations government transaction fields to tasks
ALTER TABLE "Task"
ADD COLUMN "prCompanyName" TEXT,
ADD COLUMN "prGovernmentEntity" TEXT,
ADD COLUMN "prTransactionType" TEXT,
ADD COLUMN "prGovernmentEmployee" TEXT,
ADD COLUMN "prApplicationNumber" TEXT,
ADD COLUMN "prTaxIdNumber" TEXT,
ADD COLUMN "prNationalIdNumber" TEXT,
ADD COLUMN "prNotes" TEXT,
ADD COLUMN "prUpdates" TEXT;
