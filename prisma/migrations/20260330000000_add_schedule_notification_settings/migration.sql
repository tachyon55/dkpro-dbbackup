-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "backupPath" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "catchUpOnRestart" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL,
    "smtpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFrom" TEXT,
    "notifyEmail" TEXT,
    "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slackWebhookUrl" TEXT,
    "slackChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_connectionId_key" ON "Schedule"("connectionId");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DbConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum (add new AuditEventType values)
ALTER TYPE "AuditEventType" ADD VALUE 'SCHEDULE_CREATE';
ALTER TYPE "AuditEventType" ADD VALUE 'SCHEDULE_UPDATE';
ALTER TYPE "AuditEventType" ADD VALUE 'SCHEDULE_DELETE';
ALTER TYPE "AuditEventType" ADD VALUE 'SCHEDULE_RUN';
ALTER TYPE "AuditEventType" ADD VALUE 'NOTIF_SENT';
ALTER TYPE "AuditEventType" ADD VALUE 'NOTIF_FAIL';
