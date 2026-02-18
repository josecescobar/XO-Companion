import { api } from '../client';

export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count: {
    members: number;
    dailyLogs: number;
  };
}

export interface ProjectMember {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface ProjectDetail extends Omit<ProjectSummary, '_count'> {
  zipCode: string | null;
  organizationId: string;
  members: ProjectMember[];
  _count: {
    dailyLogs: number;
  };
}

export function listProjects(): Promise<ProjectSummary[]> {
  return api<ProjectSummary[]>('/projects');
}

export function getProject(id: string): Promise<ProjectDetail> {
  return api<ProjectDetail>(`/projects/${id}`);
}
