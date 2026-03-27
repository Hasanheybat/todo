-- CreateEnum
CREATE TYPE "TodoistPriority" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "TodoistViewType" AS ENUM ('LIST', 'BOARD');

-- CreateTable
CREATE TABLE "TodoistProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#808080',
    "viewType" "TodoistViewType" NOT NULL DEFAULT 'LIST',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isInbox" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoistProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoistSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoistSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoistTask" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TodoistPriority" NOT NULL DEFAULT 'P4',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "dueString" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurRule" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "sectionId" TEXT,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoistTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoistLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#808080',
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "TodoistLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoistTaskLabel" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "TodoistTaskLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoistComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoistComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoistFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#808080',
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "TodoistFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TodoistProject_userId_idx" ON "TodoistProject"("userId");

-- CreateIndex
CREATE INDEX "TodoistProject_tenantId_idx" ON "TodoistProject"("tenantId");

-- CreateIndex
CREATE INDEX "TodoistSection_projectId_idx" ON "TodoistSection"("projectId");

-- CreateIndex
CREATE INDEX "TodoistTask_userId_idx" ON "TodoistTask"("userId");

-- CreateIndex
CREATE INDEX "TodoistTask_tenantId_idx" ON "TodoistTask"("tenantId");

-- CreateIndex
CREATE INDEX "TodoistTask_projectId_idx" ON "TodoistTask"("projectId");

-- CreateIndex
CREATE INDEX "TodoistTask_sectionId_idx" ON "TodoistTask"("sectionId");

-- CreateIndex
CREATE INDEX "TodoistTask_parentId_idx" ON "TodoistTask"("parentId");

-- CreateIndex
CREATE INDEX "TodoistTask_dueDate_idx" ON "TodoistTask"("dueDate");

-- CreateIndex
CREATE INDEX "TodoistTask_isCompleted_idx" ON "TodoistTask"("isCompleted");

-- CreateIndex
CREATE INDEX "TodoistLabel_userId_idx" ON "TodoistLabel"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TodoistLabel_userId_name_key" ON "TodoistLabel"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TodoistTaskLabel_taskId_labelId_key" ON "TodoistTaskLabel"("taskId", "labelId");

-- CreateIndex
CREATE INDEX "TodoistComment_taskId_idx" ON "TodoistComment"("taskId");

-- CreateIndex
CREATE INDEX "TodoistFilter_userId_idx" ON "TodoistFilter"("userId");

-- AddForeignKey
ALTER TABLE "TodoistProject" ADD CONSTRAINT "TodoistProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistSection" ADD CONSTRAINT "TodoistSection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TodoistProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistTask" ADD CONSTRAINT "TodoistTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TodoistProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistTask" ADD CONSTRAINT "TodoistTask_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TodoistSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistTask" ADD CONSTRAINT "TodoistTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TodoistTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistTask" ADD CONSTRAINT "TodoistTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistLabel" ADD CONSTRAINT "TodoistLabel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistTaskLabel" ADD CONSTRAINT "TodoistTaskLabel_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TodoistTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistTaskLabel" ADD CONSTRAINT "TodoistTaskLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "TodoistLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistComment" ADD CONSTRAINT "TodoistComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TodoistTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistComment" ADD CONSTRAINT "TodoistComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoistFilter" ADD CONSTRAINT "TodoistFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
