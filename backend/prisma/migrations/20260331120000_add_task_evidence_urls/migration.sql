ALTER TABLE "Task"
ADD COLUMN "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Task"
SET "evidenceUrls" = ARRAY["evidenceUrl"]
WHERE "evidenceUrl" IS NOT NULL;
