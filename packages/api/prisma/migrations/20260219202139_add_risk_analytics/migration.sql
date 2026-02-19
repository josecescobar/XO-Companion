-- CreateEnum
CREATE TYPE "RiskAlertType" AS ENUM ('DELAY_PATTERN', 'SAFETY_TREND', 'BUDGET_VARIANCE', 'WORKFORCE_SHORTAGE', 'EQUIPMENT_DOWNTIME', 'SCHEDULE_SLIP', 'WEATHER_RISK');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskAlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "risk_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "alert_type" "RiskAlertType" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source_data" JSONB,
    "status" "RiskAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risk_alerts_organization_id_idx" ON "risk_alerts"("organization_id");

-- CreateIndex
CREATE INDEX "risk_alerts_project_id_idx" ON "risk_alerts"("project_id");

-- CreateIndex
CREATE INDEX "risk_alerts_alert_type_idx" ON "risk_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "risk_alerts_status_idx" ON "risk_alerts"("status");

-- CreateIndex
CREATE INDEX "risk_alerts_severity_idx" ON "risk_alerts"("severity");

-- AddForeignKey
ALTER TABLE "risk_alerts" ADD CONSTRAINT "risk_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_alerts" ADD CONSTRAINT "risk_alerts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
