/*
  Warnings:

  - The `reason_code` column on the `review_entries` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RejectionCode" AS ENUM ('WRONG_COUNT', 'WRONG_TRADE', 'WRONG_DESCRIPTION', 'DUPLICATE', 'NOT_APPLICABLE', 'MISHEARD', 'OTHER');

-- AlterTable
ALTER TABLE "delay_entries" ADD COLUMN     "ai_confidence_reason" TEXT,
ADD COLUMN     "review_status" "ReviewStatus";

-- AlterTable
ALTER TABLE "equipment_entries" ADD COLUMN     "ai_confidence_reason" TEXT,
ADD COLUMN     "review_status" "ReviewStatus";

-- AlterTable
ALTER TABLE "material_entries" ADD COLUMN     "ai_confidence_reason" TEXT,
ADD COLUMN     "review_status" "ReviewStatus";

-- AlterTable
ALTER TABLE "review_entries" DROP COLUMN "reason_code",
ADD COLUMN     "reason_code" "RejectionCode";

-- AlterTable
ALTER TABLE "safety_entries" ADD COLUMN     "ai_confidence_reason" TEXT,
ADD COLUMN     "review_status" "ReviewStatus";

-- AlterTable
ALTER TABLE "weather_entries" ADD COLUMN     "ai_confidence_reason" TEXT,
ADD COLUMN     "review_status" "ReviewStatus";

-- AlterTable
ALTER TABLE "work_completed_entries" ADD COLUMN     "ai_confidence_reason" TEXT,
ADD COLUMN     "review_status" "ReviewStatus";

-- AlterTable
ALTER TABLE "workforce_entries" ADD COLUMN     "ai_confidence_reason" TEXT,
ADD COLUMN     "review_status" "ReviewStatus";
