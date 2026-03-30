CREATE TYPE "ProjectStatus" AS ENUM ('IN_PROGRESS', 'AT_RISK', 'COMPLETED');

CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "budget" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" INTEGER NOT NULL,
    "managerId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectComment" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN "projectId" INTEGER;

ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
