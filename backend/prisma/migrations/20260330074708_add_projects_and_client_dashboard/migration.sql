-- DropForeignKey
ALTER TABLE "ProjectComment" DROP CONSTRAINT "ProjectComment_projectId_fkey";

-- AddForeignKey
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
