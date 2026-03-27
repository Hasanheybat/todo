-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "todoistTaskId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dispatchPeriod" TEXT,
ADD COLUMN     "sourceTemplateId" TEXT;

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "businessId" TEXT,
ADD COLUMN     "deadlineDay" INTEGER,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationDay" INTEGER;

-- AlterTable
ALTER TABLE "TodoistTask" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "reminder" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TaskAssigneeFile" (
    "id" TEXT NOT NULL,
    "taskAssigneeId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaskAssigneeFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoistActivity" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "taskId" TEXT,
    "projectId" TEXT,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoistActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoistTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tasks" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#808080',
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskAssigneeFile_taskAssigneeId_idx" ON "TaskAssigneeFile"("taskAssigneeId");

-- CreateIndex
CREATE INDEX "TaskAssigneeFile_taskAssigneeId_slotNumber_idx" ON "TaskAssigneeFile"("taskAssigneeId", "slotNumber");

-- CreateIndex
CREATE INDEX "TodoistActivity_userId_idx" ON "TodoistActivity"("userId");

-- CreateIndex
CREATE INDEX "TodoistActivity_taskId_idx" ON "TodoistActivity"("taskId");

-- CreateIndex
CREATE INDEX "TodoistActivity_createdAt_idx" ON "TodoistActivity"("createdAt");

-- CreateIndex
CREATE INDEX "TodoistTemplate_userId_idx" ON "TodoistTemplate"("userId");

-- CreateIndex
CREATE INDEX "Attachment_todoistTaskId_idx" ON "Attachment"("todoistTaskId");

-- CreateIndex
CREATE INDEX "Task_sourceTemplateId_idx" ON "Task"("sourceTemplateId");

-- CreateIndex
CREATE INDEX "TaskTemplate_isRecurring_idx" ON "TaskTemplate"("isRecurring");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssigneeFile" ADD CONSTRAINT "TaskAssigneeFile_taskAssigneeId_fkey" FOREIGN KEY ("taskAssigneeId") REFERENCES "TaskAssignee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_todoistTaskId_fkey" FOREIGN KEY ("todoistTaskId") REFERENCES "TodoistTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "BusinessDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistActivity" ADD CONSTRAINT "TodoistActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TodoistTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistActivity" ADD CONSTRAINT "TodoistActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistTemplate" ADD CONSTRAINT "TodoistTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
