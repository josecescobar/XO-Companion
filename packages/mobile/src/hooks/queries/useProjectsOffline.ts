import { useOfflineFirst } from '@/lib/powersync/useOfflineQuery';
import { listProjects, getProject, type Project } from '@/api/endpoints/projects';

function rowToProject(r: any): Project {
  return {
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    code: r.code,
    address: r.address,
    city: r.city,
    state: r.state,
    clientName: null,
    contractType: null,
    contractValue: r.contract_value,
    startDate: r.start_date,
    estimatedEndDate: r.estimated_end_date,
    isActive: r.status === 'ACTIVE',
    createdAt: r.created_at,
    members: [],
  };
}

export function useProjectsOffline() {
  return useOfflineFirst<Project[]>(
    'SELECT * FROM projects ORDER BY updated_at DESC',
    [],
    (rows) => rows.map(rowToProject),
    {
      queryKey: ['projects'],
      queryFn: listProjects,
    },
  );
}

export function useProjectOffline(projectId: string) {
  return useOfflineFirst<Project | undefined>(
    'SELECT * FROM projects WHERE id = ?',
    [projectId],
    (rows) => (rows.length > 0 ? rowToProject(rows[0]) : undefined),
    {
      queryKey: ['projects', projectId],
      queryFn: () => getProject(projectId),
      enabled: !!projectId,
    },
  );
}
