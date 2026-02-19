import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, updateTask, deleteTask } from '@/api/endpoints/tasks';
import type { CreateTaskBody, UpdateTaskBody } from '@/api/endpoints/tasks';

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskBody) => createTask(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: UpdateTaskBody }) =>
      updateTask(projectId, taskId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(projectId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
