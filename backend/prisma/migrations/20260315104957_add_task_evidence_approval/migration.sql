-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "approvalAt" TIMESTAMP(3),
ADD COLUMN     "approvalBy" INTEGER,
ADD COLUMN     "approvalComment" TEXT,
ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "evidenceUploadedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceUrl" TEXT;
