/*
  Warnings:

  - Added the required column `updatedAt` to the `TaskAssignee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssigneeStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DECLINED');

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_parentId_fkey";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "approverId" TEXT;

-- AlterTable
ALTER TABLE "TaskAssignee" ADD COLUMN     "note" TEXT,
ADD COLUMN     "status" "AssigneeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserBusiness" ADD COLUMN     "customRoleId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "positionTitle" TEXT;

-- CreateTable
CREATE TABLE "BusinessDepartment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessDepartment_businessId_idx" ON "BusinessDepartment"("businessId");

-- CreateIndex
CREATE INDEX "BusinessDepartment_departmentId_idx" ON "BusinessDepartment"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDepartment_businessId_departmentId_key" ON "BusinessDepartment"("businessId", "departmentId");

-- CreateIndex
CREATE INDEX "Task_approverId_idx" ON "Task"("approverId");

-- CreateIndex
CREATE INDEX "UserBusiness_departmentId_idx" ON "UserBusiness"("departmentId");

-- CreateIndex
CREATE INDEX "UserBusiness_customRoleId_idx" ON "UserBusiness"("customRoleId");

-- AddForeignKey
ALTER TABLE "UserBusiness" ADD CONSTRAINT "UserBusiness_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBusiness" ADD CONSTRAINT "UserBusiness_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDepartment" ADD CONSTRAINT "BusinessDepartment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDepartment" ADD CONSTRAINT "BusinessDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
