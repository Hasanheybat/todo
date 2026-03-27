-- AlterTable
ALTER TABLE "TodoistTask" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "TodoistTask_reminder_reminderSent_isCompleted_idx" ON "TodoistTask"("reminder", "reminderSent", "isCompleted");
