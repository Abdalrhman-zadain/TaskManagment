CREATE TYPE "TaskRepeatType" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

ALTER TABLE "Task"
ADD COLUMN "repeatType" "TaskRepeatType" NOT NULL DEFAULT 'NONE',
ADD COLUMN "repeatEvery" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "repeatUntil" TIMESTAMP(3),
ADD COLUMN "recurrenceGroupId" TEXT,
ADD COLUMN "recurrenceIndex" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Task_recurrenceGroupId_idx" ON "Task"("recurrenceGroupId");
