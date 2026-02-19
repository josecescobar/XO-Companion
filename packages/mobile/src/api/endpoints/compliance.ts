import { api } from '../client';

// ─── Types ───────────────────────────────────────────────────────

export interface ComplianceDocument {
  id: string;
  organizationId: string;
  documentType: string;
  name: string;
  description: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  alertDays: number[];
  licenseNumber: string | null;
  issuingAuthority: string | null;
  state: string | null;
  fileUrl: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDashboard {
  summary: {
    expired: number;
    expiringSoon: number;
    upcomingRenewals: number;
  };
  expired: ComplianceDocument[];
  expiringSoon: (ComplianceDocument & { daysUntilExpiration: number })[];
  upcomingRenewals: ComplianceDocument[];
}

export interface ComplianceAlert extends ComplianceDocument {
  alertType: 'EXPIRED' | 'EXPIRING_SOON';
  daysUntilExpiration: number;
}

export interface TrainingRecord {
  id: string;
  organizationId: string;
  employeeName: string;
  employeeId: string | null;
  trainingType: string;
  topic: string;
  description: string | null;
  completedDate: string;
  expirationDate: string | null;
  trainer: string | null;
  certificationId: string | null;
  dailyLogId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Functions ───────────────────────────────────────────────

export function getComplianceDashboard(): Promise<ComplianceDashboard> {
  return api<ComplianceDashboard>('/compliance/dashboard');
}

export function getComplianceAlerts(): Promise<ComplianceAlert[]> {
  return api<ComplianceAlert[]>('/compliance/alerts');
}

export function getExpiringTraining(days = 30): Promise<TrainingRecord[]> {
  return api<TrainingRecord[]>(`/compliance/training/expiring?days=${days}`);
}
