import { api } from '../client';

export interface Task {
  id: string;
  projectId: string;
  description: string;
  assignee: string | null;
  dueDate: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  aiGenerated: boolean;
  aiConfidence: number | null;
  dailyLogId: string | null;
  voiceNoteId: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy?: { id: string; firstName: string; lastName: string };
}

export interface TaskSummary {
  pending: number;
  urgent: number;
  completedThisWeek: number;
  overdue: number;
}

export interface CreateTaskBody {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
}

export interface UpdateTaskBody {
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export function listTasks(
  projectId: string,
  filters?: { status?: string; priority?: string; assignee?: string; category?: string },
): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.assignee) params.set('assignee', filters.assignee);
  if (filters?.category) params.set('category', filters.category);
  const qs = params.toString();
  return api<Task[]>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`);
}

export function getTaskSummary(projectId: string): Promise<TaskSummary> {
  return api<TaskSummary>(`/projects/${projectId}/tasks/summary`);
}

export function createTask(projectId: string, body: CreateTaskBody): Promise<Task> {
  return api<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body });
}

export function updateTask(projectId: string, taskId: string, body: UpdateTaskBody): Promise<Task> {
  return api<Task>(`/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body });
}

export function deleteTask(projectId: string, taskId: string): Promise<void> {
  return api<void>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
}
