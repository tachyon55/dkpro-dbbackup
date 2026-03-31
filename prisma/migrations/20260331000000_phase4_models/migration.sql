-- CreateTable: SavedQuery
CREATE TABLE "SavedQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT,
    "name" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CloudStorageSettings
CREATE TABLE "CloudStorageSettings" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT,
    "region" TEXT,
    "bucket" TEXT,
    "accessKeyId" TEXT,
    "secretAccessKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudStorageSettings_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Schedule — add cloudUpload
ALTER TABLE "Schedule" ADD COLUMN "cloudUpload" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: BackupHistory — add cloudUploadStatus
ALTER TABLE "BackupHistory" ADD COLUMN "cloudUploadStatus" TEXT;

-- CreateIndex
CREATE INDEX "SavedQuery_userId_idx" ON "SavedQuery"("userId");

-- AddForeignKey
ALTER TABLE "SavedQuery" ADD CONSTRAINT "SavedQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
