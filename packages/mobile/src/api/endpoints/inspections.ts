import { api } from '../client';

export interface InspectionFinding {
  category: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'OBSERVATION';
  description: string;
  expectedCondition?: string;
  actualCondition: string;
  recommendation: string;
  confidence: number;
}

export interface InspectionDetail {
  id: string;
  projectId: string;
  mediaId: string;
  documentId: string | null;
  dailyLogId: string | null;
  title: string;
  description: string | null;
  inspectionType: InspectionType;
  status: InspectionStatus;
  aiAnalysis: string | null;
  aiFindings: {
    overallAssessment: string;
    overallScore: number;
    summary: string;
    findings: InspectionFinding[];
    specReferences?: string[];
    photoCoverage: string;
  } | null;
  aiOverallScore: number | null;
  aiProcessedAt: string | null;
  processingError: string | null;
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
  media: { id: string; fileName: string; mimeType: string };
  document: { id: string; title: string; category: string } | null;
}

export type InspectionType =
  | 'DRAWING_COMPARISON' | 'SPEC_COMPLIANCE' | 'SAFETY_CHECK'
  | 'QUALITY_CHECK' | 'PROGRESS_PHOTO' | 'GENERAL';

export type InspectionStatus =
  | 'PENDING' | 'PROCESSING' | 'PASS' | 'FAIL' | 'NEEDS_ATTENTION' | 'INCONCLUSIVE';

export interface InspectionSummary {
  total: number;
  pass: number;
  fail: number;
  needsAttention: number;
  pending: number;
}

export function createInspection(
  projectId: string,
  body: {
    mediaId: string;
    documentId?: string;
    dailyLogId?: string;
    title: string;
    description?: string;
    inspectionType: InspectionType;
  },
): Promise<InspectionDetail> {
  return api<InspectionDetail>(`/projects/${projectId}/inspections`, {
    method: 'POST',
    body,
  });
}

export function listInspections(
  projectId: string,
  filters?: { inspectionType?: string; status?: string; dailyLogId?: string },
): Promise<InspectionDetail[]> {
  const params = new URLSearchParams();
  if (filters?.inspectionType) params.append('inspectionType', filters.inspectionType);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.dailyLogId) params.append('dailyLogId', filters.dailyLogId);
  const qs = params.toString();
  return api<InspectionDetail[]>(`/projects/${projectId}/inspections${qs ? `?${qs}` : ''}`);
}

export function getInspection(projectId: string, inspectionId: string): Promise<InspectionDetail> {
  return api<InspectionDetail>(`/projects/${projectId}/inspections/${inspectionId}`);
}

export function reviewInspection(
  projectId: string,
  inspectionId: string,
  body: { result: InspectionStatus; notes?: string },
): Promise<InspectionDetail> {
  return api<InspectionDetail>(`/projects/${projectId}/inspections/${inspectionId}/review`, {
    method: 'POST',
    body,
  });
}

export function deleteInspection(projectId: string, inspectionId: string): Promise<void> {
  return api<void>(`/projects/${projectId}/inspections/${inspectionId}`, {
    method: 'DELETE',
  });
}

export function getInspectionSummary(projectId: string): Promise<InspectionSummary> {
  return api<InspectionSummary>(`/projects/${projectId}/inspections/summary`);
}
