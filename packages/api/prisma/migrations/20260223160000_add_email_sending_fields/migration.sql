-- Add SEND_FAILED status to CommunicationStatus enum
ALTER TYPE "CommunicationStatus" ADD VALUE 'SEND_FAILED';

-- Add external message ID column for tracking sent emails
ALTER TABLE "communications" ADD COLUMN "external_message_id" TEXT;
