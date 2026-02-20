-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('DRAWING_COMPARISON', 'SPEC_COMPLIANCE', 'SAFETY_CHECK', 'QUALITY_CHECK', 'PROGRESS_PHOTO', 'GENERAL');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PENDING', 'PROCESSING', 'PASS', 'FAIL', 'NEEDS_ATTENTION', 'INCONCLUSIVE');

-- CreateTable
CREATE TABLE "inspections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "daily_log_id" UUID,
    "media_id" UUID NOT NULL,
    "document_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "inspection_type" "InspectionType" NOT NULL,
    "status" "InspectionResult" NOT NULL DEFAULT 'PENDING',
    "ai_analysis" TEXT,
    "ai_findings" JSONB,
    "ai_overall_score" DOUBLE PRECISION,
    "ai_processed_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "rag_context_used" JSONB,
    "tokens_used" INTEGER,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspections_project_id_status_idx" ON "inspections"("project_id", "status");

-- CreateIndex
CREATE INDEX "inspections_project_id_inspection_type_idx" ON "inspections"("project_id", "inspection_type");

-- CreateIndex
CREATE INDEX "inspections_media_id_idx" ON "inspections"("media_id");

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "project_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
