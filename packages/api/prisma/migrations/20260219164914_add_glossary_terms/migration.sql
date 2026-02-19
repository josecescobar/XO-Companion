-- CreateEnum
CREATE TYPE "GlossaryCategory" AS ENUM ('TRADE', 'EQUIPMENT', 'MATERIAL', 'ABBREVIATION', 'UNIT', 'OTHER');

-- CreateTable
CREATE TABLE "glossary_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term" TEXT NOT NULL,
    "aliases" TEXT[],
    "category" "GlossaryCategory" NOT NULL,
    "csi_code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "organization_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glossary_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "glossary_terms_organization_id_idx" ON "glossary_terms"("organization_id");

-- CreateIndex
CREATE INDEX "glossary_terms_category_idx" ON "glossary_terms"("category");

-- CreateIndex
CREATE UNIQUE INDEX "glossary_terms_term_organization_id_key" ON "glossary_terms"("term", "organization_id");

-- AddForeignKey
ALTER TABLE "glossary_terms" ADD CONSTRAINT "glossary_terms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
