/*
  Warnings:

  - You are about to drop the column `note` on the `TaskAssignee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "bulkNotes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "finalized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TaskAssignee" DROP COLUMN "note",
ADD COLUMN     "approverNotes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "chatClosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" JSONB NOT NULL DEFAULT '[]';
