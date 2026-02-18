import { api } from '../client';

export interface PendingReviewItem {
  entityId: string;
  entityType: string;
  dailyLogId: string;
  logDate: string;
  fieldName?: string;
  currentValue: Record<string, unknown>;
  aiConfidence: number;
  createdAt: string;
}

export interface ReviewAuditEntry {
  id: string;
  dailyLogId: string;
  entityType: string;
  entityId: string;
  fieldName: string | null;
  action: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  comment: string | null;
  reviewedById: string;
  createdAt: string;
}

export interface ReviewStats {
  totalReviewed: number;
  approved: number;
  rejected: number;
  modified: number;
  byEntityType: Record<string, { total: number; approved: number; rejected: number; modified: number }>;
}

export function getPendingReviews(
  projectId: string,
  logId: string,
): Promise<PendingReviewItem[]> {
  return api<PendingReviewItem[]>(
    `/projects/${projectId}/daily-logs/${logId}/reviews/pending`,
  );
}

export function submitReview(
  projectId: string,
  logId: string,
  data: {
    entityId: string;
    entityType: string;
    fieldName?: string;
    action: 'APPROVED' | 'REJECTED' | 'MODIFIED';
    reasonCode?: string;
    newValue?: Record<string, unknown>;
    comment?: string;
  },
): Promise<ReviewAuditEntry> {
  return api<ReviewAuditEntry>(
    `/projects/${projectId}/daily-logs/${logId}/reviews`,
    { method: 'POST', body: data },
  );
}

export function getReviewHistory(
  projectId: string,
  logId: string,
): Promise<ReviewAuditEntry[]> {
  return api<ReviewAuditEntry[]>(
    `/projects/${projectId}/daily-logs/${logId}/reviews`,
  );
}

export function getReviewStats(
  projectId: string,
): Promise<ReviewStats> {
  return api<ReviewStats>(`/projects/${projectId}/reviews/stats`);
}
