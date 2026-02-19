import { api } from '../client';

// ─── Types ───────────────────────────────────────────────────────

export interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface RegisterUserBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

// ─── API Functions ───────────────────────────────────────────────

export function listUsers(): Promise<OrgUser[]> {
  return api<OrgUser[]>('/users');
}

export function getUser(id: string): Promise<OrgUser> {
  return api<OrgUser>(`/users/${id}`);
}

export function registerUser(body: RegisterUserBody): Promise<OrgUser> {
  return api<OrgUser>('/auth/register', { method: 'POST', body });
}

export function deactivateUser(id: string): Promise<void> {
  return api(`/users/${id}`, { method: 'DELETE' });
}
