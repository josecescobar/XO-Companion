import { api } from '../client';

// ─── Types ───────────────────────────────────────────────────────

export interface ProjectMember {
  userId: string;
  role: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  clientName: string | null;
  contractType: string | null;
  contractValue: number | null;
  startDate: string | null;
  estimatedEndDate: string | null;
  isActive: boolean;
  createdAt: string;
  members: ProjectMember[];
  _count?: {
    members?: number;
    dailyLogs?: number;
  };
}

// Backward-compatible aliases used by existing screens
export type ProjectSummary = Project;
export type ProjectDetail = Project;

export interface CreateProjectBody {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  clientName?: string;
  contractType?: string;
  contractValue?: number;
  startDate?: string;
  estimatedEndDate?: string;
}

export interface UpdateProjectBody {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  clientName?: string;
  contractType?: string;
  contractValue?: number;
  startDate?: string;
  estimatedEndDate?: string;
  isActive?: boolean;
}

export interface AddMemberBody {
  userId: string;
  role: string;
}

// ─── API Functions ───────────────────────────────────────────────

export function listProjects(): Promise<Project[]> {
  return api<Project[]>('/projects');
}

export function getProject(id: string): Promise<Project> {
  return api<Project>(`/projects/${id}`);
}

export function createProject(body: CreateProjectBody): Promise<Project> {
  return api<Project>('/projects', { method: 'POST', body });
}

export function updateProject(id: string, body: UpdateProjectBody): Promise<Project> {
  return api<Project>(`/projects/${id}`, { method: 'PATCH', body });
}

export function getMembers(projectId: string): Promise<ProjectMember[]> {
  return api<ProjectMember[]>(`/projects/${projectId}/members`);
}

export function addMember(projectId: string, body: AddMemberBody): Promise<ProjectMember> {
  return api<ProjectMember>(`/projects/${projectId}/members`, { method: 'POST', body });
}

export function removeMember(projectId: string, userId: string): Promise<void> {
  return api(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
}
