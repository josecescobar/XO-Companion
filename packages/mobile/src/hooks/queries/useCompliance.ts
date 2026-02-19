import { useQuery } from '@tanstack/react-query';
import { getComplianceDashboard, getComplianceAlerts, getExpiringTraining } from '@/api/endpoints/compliance';

export function useComplianceDashboard() {
  return useQuery({
    queryKey: ['compliance', 'dashboard'],
    queryFn: getComplianceDashboard,
  });
}

export function useComplianceAlerts() {
  return useQuery({
    queryKey: ['compliance', 'alerts'],
    queryFn: getComplianceAlerts,
  });
}

export function useExpiringTraining(days = 30) {
  return useQuery({
    queryKey: ['compliance', 'training', 'expiring', days],
    queryFn: () => getExpiringTraining(days),
  });
}
