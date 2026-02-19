-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'PENDING_UPLOAD', 'UPLOAD_FAILED');

-- AlterTable
ALTER TABLE "voice_notes" ADD COLUMN     "sync_status" "SyncStatus" NOT NULL DEFAULT 'SYNCED';

-- CreateTable
CREATE TABLE "sync_conflict_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "table" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "client_data" JSONB NOT NULL,
    "server_data" JSONB NOT NULL,
    "client_timestamp" TIMESTAMP(3) NOT NULL,
    "server_timestamp" TIMESTAMP(3) NOT NULL,
    "resolution" TEXT NOT NULL DEFAULT 'SERVER_WINS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_conflict_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_conflict_logs_organization_id_idx" ON "sync_conflict_logs"("organization_id");

-- CreateIndex
CREATE INDEX "sync_conflict_logs_table_record_id_idx" ON "sync_conflict_logs"("table", "record_id");

-- CreateIndex
CREATE INDEX "voice_notes_sync_status_idx" ON "voice_notes"("sync_status");
