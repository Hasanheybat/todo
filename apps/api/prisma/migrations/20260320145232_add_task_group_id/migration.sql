-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Task_groupId_idx" ON "Task"("groupId");
