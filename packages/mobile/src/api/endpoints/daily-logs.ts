import { api } from '../client';

export interface DailyLogSummary {
  id: string;
  projectId: string;
  logDate: string;
  status: string;
  reportNumber: number | null;
  notes: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    workforce: number;
    equipment: number;
    workCompleted: number;
    materials: number;
    delays: number;
    voiceNotes: number;
    signatures: number;
  };
}

export interface WeatherEntry {
  id: string;
  conditions: string[];
  tempHigh: number | null;
  tempLow: number | null;
  precipitation: string | null;
  windSpeed: number | null;
  windDirection: string | null;
  humidity: number | null;
  delayMinutes: number;
  aiGenerated: boolean;
  aiConfidence: number | null;
}

export interface WorkforceEntry {
  id: string;
  trade: string;
  company: string;
  workerCount: number;
  hoursWorked: number;
  overtimeHours: number;
  foreman: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
}

export interface EquipmentEntry {
  id: string;
  equipmentType: string;
  equipmentId: string | null;
  operatingHours: number;
  idleHours: number;
  condition: string;
  notes: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
}

export interface WorkCompletedEntry {
  id: string;
  location: string;
  csiCode: string | null;
  csiDescription: string | null;
  description: string;
  percentComplete: number | null;
  quantity: number | null;
  unit: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
}

export interface MaterialEntry {
  id: string;
  material: string;
  quantity: number;
  unit: string;
  supplier: string | null;
  ticketNumber: string | null;
  condition: string;
  aiGenerated: boolean;
  aiConfidence: number | null;
}

export interface SafetyEntry {
  id: string;
  toolboxTalks: string[];
  inspections: string[];
  incidents: string[];
  oshaRecordable: boolean;
  nearMisses: number;
  firstAidCases: number;
  notes: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
}

export interface DelayEntry {
  id: string;
  cause: string;
  description: string;
  durationMinutes: number;
  impactedTrades: string[];
  aiGenerated: boolean;
  aiConfidence: number | null;
}

export interface VoiceNoteSummary {
  id: string;
  status: string;
  durationSeconds: number | null;
  createdAt: string;
}

export interface SignatureEntry {
  id: string;
  role: string;
  signatureData: string;
  signedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface DailyLogDetail {
  id: string;
  projectId: string;
  logDate: string;
  status: string;
  reportNumber: number | null;
  notes: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  weather: WeatherEntry | null;
  safety: SafetyEntry | null;
  workforce: WorkforceEntry[];
  equipment: EquipmentEntry[];
  workCompleted: WorkCompletedEntry[];
  materials: MaterialEntry[];
  delays: DelayEntry[];
  voiceNotes: VoiceNoteSummary[];
  signatures: SignatureEntry[];
}

interface DailyLogFilters {
  status?: string;
  from?: string;
  to?: string;
}

export function listDailyLogs(
  projectId: string,
  filters?: DailyLogFilters,
): Promise<DailyLogSummary[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  const qs = params.toString();
  return api<DailyLogSummary[]>(
    `/projects/${projectId}/daily-logs${qs ? `?${qs}` : ''}`,
  );
}

export function getDailyLog(
  projectId: string,
  logId: string,
): Promise<DailyLogDetail> {
  return api<DailyLogDetail>(`/projects/${projectId}/daily-logs/${logId}`);
}
