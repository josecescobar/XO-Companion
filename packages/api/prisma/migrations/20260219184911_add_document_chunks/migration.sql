-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ChunkSourceType" AS ENUM ('DAILY_LOG_SUMMARY', 'VOICE_TRANSCRIPT', 'MANUAL_NOTE');

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "source_type" "ChunkSourceType" NOT NULL,
    "source_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "embedding" vector(1536),
    "embedded" BOOLEAN NOT NULL DEFAULT false,
    "source_date" DATE NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_chunks_project_id_idx" ON "document_chunks"("project_id");

-- CreateIndex
CREATE INDEX "document_chunks_source_type_source_id_idx" ON "document_chunks"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "document_chunks_source_date_idx" ON "document_chunks"("source_date");

-- CreateIndex
CREATE INDEX "document_chunks_embedded_idx" ON "document_chunks"("embedded");

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (IVFFlat for cosine similarity search)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1);
