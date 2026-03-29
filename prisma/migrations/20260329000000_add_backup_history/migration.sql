-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'BACKUP_START';
ALTER TYPE "AuditEventType" ADD VALUE 'BACKUP_COMPLETE';
ALTER TYPE "AuditEventType" ADD VALUE 'BACKUP_FAIL';

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('running', 'success', 'failed');

-- CreateTable
CREATE TABLE "BackupHistory" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT,
    "connectionName" TEXT NOT NULL,
    "dbType" "DbType" NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'running',
    "fileName" TEXT,
    "filePath" TEXT,
    "fileSizeBytes" BIGINT,
    "sha256" TEXT,
    "durationMs" INTEGER,
    "fullLog" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BackupHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupHistory_connectionId_idx" ON "BackupHistory"("connectionId");

-- CreateIndex
CREATE INDEX "BackupHistory_status_idx" ON "BackupHistory"("status");

-- CreateIndex
CREATE INDEX "BackupHistory_startedAt_idx" ON "BackupHistory"("startedAt");

-- AddForeignKey
ALTER TABLE "BackupHistory" ADD CONSTRAINT "BackupHistory_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DbConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
