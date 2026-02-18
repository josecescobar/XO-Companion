import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEntry, updateEntry, deleteEntry, upsertSingleton } from '@/api/endpoints/daily-logs';
import type { EntityType } from '@/api/endpoints/daily-logs';

type MutationAction = 'create' | 'update' | 'delete' | 'upsert';

interface EntryMutationVars {
  projectId: string;
  logId: string;
  entryId?: string;
  body?: Record<string, unknown>;
}

export function useEntryMutation(entityType: EntityType, action: MutationAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: EntryMutationVars) => {
      switch (action) {
        case 'create':
          return createEntry(vars.projectId, vars.logId, entityType, vars.body!);
        case 'update':
          return updateEntry(vars.projectId, vars.logId, entityType, vars.entryId!, vars.body!);
        case 'delete':
          return deleteEntry(vars.projectId, vars.logId, entityType, vars.entryId!);
        case 'upsert':
          return upsertSingleton(vars.projectId, vars.logId, entityType as 'weather' | 'safety', vars.body!);
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['daily-logs', vars.projectId, vars.logId],
      });
    },
  });
}
