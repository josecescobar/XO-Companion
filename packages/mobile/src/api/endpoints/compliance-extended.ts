import { api } from '../client';

// Re-export existing types
export type { ComplianceDocument, ComplianceDashboard, ComplianceAlert, TrainingRecord } from './compliance';
export { getComplianceDashboard, getComplianceAlerts, getExpiringTraining } from './compliance';

// ─── Additional Types ────────────────────────────────────────────

export interface CreateDocumentBody {
  documentType: string;
  name: string;
  description?: string;
  issueDate?: string;
  expirationDate?: string;
  alertDays?: number[];
  licenseNumber?: string;
  issuingAuthority?: string;
  state?: string;
  projectId?: string;
}

export interface Incident {
  id: string;
  projectId: string | null;
  employeeName: string;
  incidentDate: string;
  incidentTime: string | null;
  location: string | null;
  description: string;
  bodyPartAffected: string | null;
  natureOfInjury: string | null;
  isRecordable: boolean;
  daysAwayFromWork: number;
  daysRestrictedDuty: number;
  outcome: string | null;
  witnessNames: string[];
  correctiveActions: string | null;
  createdAt: string;
}

export interface CreateIncidentBody {
  projectId?: string;
  employeeName: string;
  incidentDate: string;
  incidentTime?: string;
  location?: string;
  description: string;
  bodyPartAffected?: string;
  natureOfInjury?: string;
  isRecordable?: boolean;
  daysAwayFromWork?: number;
  daysRestrictedDuty?: number;
  outcome?: string;
  witnessNames?: string[];
  correctiveActions?: string;
}

export interface CreateTrainingBody {
  employeeName: string;
  trainingType: string;
  topic: string;
  description?: string;
  completedDate: string;
  expirationDate?: string;
  trainer?: string;
  certificationId?: string;
  dailyLogId?: string;
  projectId?: string;
}

// ─── Documents API ───────────────────────────────────────────────

export function listDocuments(type?: string): Promise<import('./compliance').ComplianceDocument[]> {
  const qs = type ? `?type=${type}` : '';
  return api(`/compliance/documents${qs}`);
}

export function createDocument(body: CreateDocumentBody): Promise<import('./compliance').ComplianceDocument> {
  return api('/compliance/documents', { method: 'POST', body });
}

export function deleteDocument(id: string): Promise<void> {
  return api(`/compliance/documents/${id}`, { method: 'DELETE' });
}

// ─── Incidents API ───────────────────────────────────────────────

export function listIncidents(filters?: {
  projectId?: string;
  isRecordable?: boolean;
}): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filters?.projectId) params.set('projectId', filters.projectId);
  if (filters?.isRecordable !== undefined) params.set('isRecordable', String(filters.isRecordable));
  const qs = params.toString();
  return api(`/compliance/incidents${qs ? `?${qs}` : ''}`);
}

export function getIncident(id: string): Promise<Incident> {
  return api(`/compliance/incidents/${id}`);
}

export function createIncident(body: CreateIncidentBody): Promise<Incident> {
  return api('/compliance/incidents', { method: 'POST', body });
}

// ─── Training API ────────────────────────────────────────────────

export function listTraining(filters?: {
  employeeName?: string;
  trainingType?: string;
}): Promise<import('./compliance').TrainingRecord[]> {
  const params = new URLSearchParams();
  if (filters?.employeeName) params.set('employeeName', filters.employeeName);
  if (filters?.trainingType) params.set('trainingType', filters.trainingType);
  const qs = params.toString();
  return api(`/compliance/training${qs ? `?${qs}` : ''}`);
}

export function createTraining(body: CreateTrainingBody): Promise<import('./compliance').TrainingRecord> {
  return api('/compliance/training', { method: 'POST', body });
}

// ─── OSHA Forms API ──────────────────────────────────────────────

export interface OshaForm300 {
  year: number;
  entries: unknown[];
  totals: Record<string, number>;
}

export interface OshaForm300A {
  year: number;
  summary: Record<string, unknown>;
}

export interface OshaForm301 {
  incidentId: string;
  formData: Record<string, unknown>;
}

export function getForm300(year?: number): Promise<OshaForm300> {
  const qs = year ? `?year=${year}` : '';
  return api(`/compliance/osha/form-300${qs}`);
}

export function getForm300A(year?: number): Promise<OshaForm300A> {
  const qs = year ? `?year=${year}` : '';
  return api(`/compliance/osha/form-300a${qs}`);
}

export function getForm301(incidentId: string): Promise<OshaForm301> {
  return api(`/compliance/osha/form-301/${incidentId}`);
}
