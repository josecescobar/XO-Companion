import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, updateProject, addMember, removeMember } from '@/api/endpoints/projects';
import { registerUser } from '@/api/endpoints/users';
import { createDocument, createIncident, createTraining, deleteDocument } from '@/api/endpoints/compliance-extended';
import type { CreateProjectBody, UpdateProjectBody, AddMemberBody } from '@/api/endpoints/projects';
import type { RegisterUserBody } from '@/api/endpoints/users';
import type { CreateDocumentBody, CreateIncidentBody, CreateTrainingBody } from '@/api/endpoints/compliance-extended';

// ─── Projects ────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectBody) => createProject(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdateProjectBody) => updateProject(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...body }: { projectId: string } & AddMemberBody) =>
      addMember(projectId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      removeMember(projectId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}

// ─── Users ───────────────────────────────────────────────────────

export function useRegisterUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterUserBody) => registerUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ─── Compliance ──────────────────────────────────────────────────

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDocumentBody) => createDocument(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateIncidentBody) => createIncident(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });
}

export function useCreateTraining() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTrainingBody) => createTraining(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });
}
