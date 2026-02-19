-- CreateEnum
CREATE TYPE "OshaCaseType" AS ENUM ('DEATH', 'DAYS_AWAY', 'RESTRICTED', 'MEDICAL_TREATMENT', 'OTHER_RECORDABLE');

-- CreateEnum
CREATE TYPE "ComplianceDocType" AS ENUM ('CONTRACTOR_LICENSE', 'BUSINESS_LICENSE', 'GENERAL_LIABILITY', 'WORKERS_COMP', 'AUTO_INSURANCE', 'UMBRELLA_POLICY', 'PROFESSIONAL_LIABILITY', 'BOND', 'EPA_CERTIFICATION', 'OSHA_CERTIFICATION', 'TRADE_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceDocStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED', 'CANCELLED');

-- DropIndex
DROP INDEX "idx_document_chunks_embedding";

-- CreateTable
CREATE TABLE "osha_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "employee_name" TEXT NOT NULL,
    "employee_job_title" TEXT,
    "employee_date_of_birth" TIMESTAMP(3),
    "employee_hire_date" TIMESTAMP(3),
    "incident_date" TIMESTAMP(3) NOT NULL,
    "incident_time" TEXT,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "injury_type" TEXT,
    "body_part" TEXT,
    "object_or_substance" TEXT,
    "death_date" TIMESTAMP(3),
    "days_away_from_work" INTEGER,
    "days_restricted" INTEGER,
    "is_recordable" BOOLEAN NOT NULL DEFAULT false,
    "case_type" "OshaCaseType",
    "daily_log_id" UUID,
    "safety_entry_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "osha_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "document_type" "ComplianceDocType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "issue_date" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "status" "ComplianceDocStatus" NOT NULL DEFAULT 'ACTIVE',
    "alert_days" INTEGER[] DEFAULT ARRAY[90, 60, 30, 14]::INTEGER[],
    "last_alert_sent" TIMESTAMP(3),
    "license_number" TEXT,
    "issuing_authority" TEXT,
    "state" TEXT,
    "file_url" TEXT,
    "project_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_name" TEXT NOT NULL,
    "employee_id" UUID,
    "training_type" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "completed_date" TIMESTAMP(3) NOT NULL,
    "expiration_date" TIMESTAMP(3),
    "trainer" TEXT,
    "certification_id" TEXT,
    "daily_log_id" UUID,
    "project_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "osha_incidents_organization_id_idx" ON "osha_incidents"("organization_id");

-- CreateIndex
CREATE INDEX "osha_incidents_project_id_idx" ON "osha_incidents"("project_id");

-- CreateIndex
CREATE INDEX "osha_incidents_incident_date_idx" ON "osha_incidents"("incident_date");

-- CreateIndex
CREATE INDEX "compliance_documents_organization_id_idx" ON "compliance_documents"("organization_id");

-- CreateIndex
CREATE INDEX "compliance_documents_expiration_date_idx" ON "compliance_documents"("expiration_date");

-- CreateIndex
CREATE INDEX "compliance_documents_status_idx" ON "compliance_documents"("status");

-- CreateIndex
CREATE INDEX "training_records_organization_id_idx" ON "training_records"("organization_id");

-- CreateIndex
CREATE INDEX "training_records_employee_name_idx" ON "training_records"("employee_name");

-- CreateIndex
CREATE INDEX "training_records_expiration_date_idx" ON "training_records"("expiration_date");

-- AddForeignKey
ALTER TABLE "osha_incidents" ADD CONSTRAINT "osha_incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "osha_incidents" ADD CONSTRAINT "osha_incidents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
