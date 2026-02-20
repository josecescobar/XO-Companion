-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('EMAIL', 'TEXT', 'CALL', 'RFI', 'CHANGE_ORDER');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFTING', 'DRAFT', 'APPROVED', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunicationUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "communications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "daily_log_id" UUID,
    "voice_note_id" UUID,
    "type" "CommunicationType" NOT NULL,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFTING',
    "urgency" "CommunicationUrgency" NOT NULL DEFAULT 'NORMAL',
    "recipient" TEXT NOT NULL,
    "recipient_email" TEXT,
    "recipient_phone" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "context" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "ai_confidence" DOUBLE PRECISION,
    "ai_drafted_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "tokens_used" INTEGER,
    "edited_body" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communications_project_id_status_idx" ON "communications"("project_id", "status");

-- CreateIndex
CREATE INDEX "communications_project_id_type_idx" ON "communications"("project_id", "type");

-- CreateIndex
CREATE INDEX "communications_created_by_id_idx" ON "communications"("created_by_id");

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
