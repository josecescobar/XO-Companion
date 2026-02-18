import { useQuery } from '@tanstack/react-query';
import { listProjects, getProject } from '@/api/endpoints/projects';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });
}
