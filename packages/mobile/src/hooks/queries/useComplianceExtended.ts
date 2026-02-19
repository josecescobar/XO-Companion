import { useQuery } from '@tanstack/react-query';
import { listIncidents, listDocuments, listTraining, getForm300, getForm300A } from '@/api/endpoints/compliance-extended';

export function useIncidents(filters?: { projectId?: string; isRecordable?: boolean }) {
  return useQuery({
    queryKey: ['compliance', 'incidents', filters],
    queryFn: () => listIncidents(filters),
  });
}

export function useDocuments(type?: string) {
  return useQuery({
    queryKey: ['compliance', 'documents', type],
    queryFn: () => listDocuments(type),
  });
}

export function useTrainingRecords(filters?: { employeeName?: string; trainingType?: string }) {
  return useQuery({
    queryKey: ['compliance', 'training', filters],
    queryFn: () => listTraining(filters),
  });
}

export function useForm300(year?: number) {
  return useQuery({
    queryKey: ['compliance', 'osha', 'form-300', year],
    queryFn: () => getForm300(year),
  });
}

export function useForm300A(year?: number) {
  return useQuery({
    queryKey: ['compliance', 'osha', 'form-300a', year],
    queryFn: () => getForm300A(year),
  });
}
