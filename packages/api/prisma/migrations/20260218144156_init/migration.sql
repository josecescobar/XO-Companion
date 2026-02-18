-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT', 'FOREMAN', 'FIELD_WORKER', 'OWNER_REP', 'SAFETY_OFFICER');

-- CreateEnum
CREATE TYPE "DailyLogStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'AMENDED');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('CLEAR', 'PARTLY_CLOUDY', 'OVERCAST', 'RAIN', 'HEAVY_RAIN', 'SNOW', 'SLEET', 'FOG', 'WIND', 'THUNDERSTORM', 'EXTREME_HEAT', 'EXTREME_COLD');

-- CreateEnum
CREATE TYPE "DelayCause" AS ENUM ('WEATHER', 'MATERIAL_SHORTAGE', 'EQUIPMENT_FAILURE', 'LABOR_SHORTAGE', 'DESIGN_CHANGE', 'OWNER_DIRECTED', 'PERMIT_ISSUE', 'INSPECTION_HOLD', 'UTILITY_CONFLICT', 'SUBCONTRACTOR', 'SAFETY_STOP', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentCondition" AS ENUM ('OPERATIONAL', 'NEEDS_MAINTENANCE', 'DOWN_FOR_REPAIR', 'IDLE');

-- CreateEnum
CREATE TYPE "MaterialCondition" AS ENUM ('GOOD', 'DAMAGED', 'PARTIAL_DELIVERY', 'REJECTED');

-- CreateEnum
CREATE TYPE "VoiceNoteStatus" AS ENUM ('UPLOADING', 'TRANSCRIBING', 'EXTRACTING', 'REVIEW_READY', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('APPROVED', 'REJECTED', 'MODIFIED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "organization_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "family" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "organization_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "log_date" DATE NOT NULL,
    "status" "DailyLogStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "report_number" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "conditions" "WeatherCondition"[],
    "temp_high" DOUBLE PRECISION,
    "temp_low" DOUBLE PRECISION,
    "precipitation" TEXT,
    "wind_speed" DOUBLE PRECISION,
    "wind_direction" TEXT,
    "humidity" DOUBLE PRECISION,
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "trade" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "worker_count" INTEGER NOT NULL,
    "hours_worked" DOUBLE PRECISION NOT NULL,
    "overtime_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "foreman" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workforce_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "equipment_type" TEXT NOT NULL,
    "equipment_id" TEXT,
    "operating_hours" DOUBLE PRECISION NOT NULL,
    "idle_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "condition" "EquipmentCondition" NOT NULL,
    "notes" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_completed_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "csi_code" TEXT,
    "csi_description" TEXT,
    "description" TEXT NOT NULL,
    "percent_complete" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_completed_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "material" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "supplier" TEXT,
    "ticket_number" TEXT,
    "condition" "MaterialCondition" NOT NULL DEFAULT 'GOOD',
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "toolbox_talks" TEXT[],
    "inspections" TEXT[],
    "incidents" TEXT[],
    "osha_recordable" BOOLEAN NOT NULL DEFAULT false,
    "near_misses" INTEGER NOT NULL DEFAULT 0,
    "first_aid_cases" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delay_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "cause" "DelayCause" NOT NULL,
    "description" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "impacted_trades" TEXT[],
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delay_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "audio_url" TEXT NOT NULL,
    "audio_size" INTEGER,
    "duration_seconds" INTEGER,
    "mime_type" TEXT NOT NULL DEFAULT 'audio/webm',
    "transcript" TEXT,
    "status" "VoiceNoteStatus" NOT NULL DEFAULT 'UPLOADING',
    "ai_processed" BOOLEAN NOT NULL DEFAULT false,
    "extracted_data" JSONB,
    "processing_error" TEXT,
    "assemblyai_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "signature_data" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_log_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "field_name" TEXT,
    "action" "ReviewAction" NOT NULL,
    "reason_code" TEXT,
    "previous_value" JSONB,
    "new_value" JSONB,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "projects_organization_id_idx" ON "projects"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_id_code_key" ON "projects"("organization_id", "code");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "daily_logs_project_id_status_idx" ON "daily_logs"("project_id", "status");

-- CreateIndex
CREATE INDEX "daily_logs_created_by_id_idx" ON "daily_logs"("created_by_id");

-- CreateIndex
CREATE INDEX "daily_logs_log_date_idx" ON "daily_logs"("log_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_project_id_log_date_key" ON "daily_logs"("project_id", "log_date");

-- CreateIndex
CREATE UNIQUE INDEX "weather_entries_daily_log_id_key" ON "weather_entries"("daily_log_id");

-- CreateIndex
CREATE INDEX "workforce_entries_daily_log_id_idx" ON "workforce_entries"("daily_log_id");

-- CreateIndex
CREATE INDEX "equipment_entries_daily_log_id_idx" ON "equipment_entries"("daily_log_id");

-- CreateIndex
CREATE INDEX "work_completed_entries_daily_log_id_idx" ON "work_completed_entries"("daily_log_id");

-- CreateIndex
CREATE INDEX "work_completed_entries_csi_code_idx" ON "work_completed_entries"("csi_code");

-- CreateIndex
CREATE INDEX "material_entries_daily_log_id_idx" ON "material_entries"("daily_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "safety_entries_daily_log_id_key" ON "safety_entries"("daily_log_id");

-- CreateIndex
CREATE INDEX "delay_entries_daily_log_id_idx" ON "delay_entries"("daily_log_id");

-- CreateIndex
CREATE INDEX "voice_notes_daily_log_id_idx" ON "voice_notes"("daily_log_id");

-- CreateIndex
CREATE INDEX "voice_notes_user_id_idx" ON "voice_notes"("user_id");

-- CreateIndex
CREATE INDEX "voice_notes_status_idx" ON "voice_notes"("status");

-- CreateIndex
CREATE INDEX "signatures_daily_log_id_idx" ON "signatures"("daily_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "signatures_daily_log_id_user_id_key" ON "signatures"("daily_log_id", "user_id");

-- CreateIndex
CREATE INDEX "review_entries_daily_log_id_idx" ON "review_entries"("daily_log_id");

-- CreateIndex
CREATE INDEX "review_entries_reviewer_id_idx" ON "review_entries"("reviewer_id");

-- CreateIndex
CREATE INDEX "review_entries_entity_type_entity_id_idx" ON "review_entries"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_entries" ADD CONSTRAINT "weather_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_entries" ADD CONSTRAINT "workforce_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_entries" ADD CONSTRAINT "equipment_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_completed_entries" ADD CONSTRAINT "work_completed_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_entries" ADD CONSTRAINT "material_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_entries" ADD CONSTRAINT "safety_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delay_entries" ADD CONSTRAINT "delay_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_entries" ADD CONSTRAINT "review_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_entries" ADD CONSTRAINT "review_entries_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
