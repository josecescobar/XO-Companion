import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@/api/endpoints/users';

export function useOrgUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  });
}
