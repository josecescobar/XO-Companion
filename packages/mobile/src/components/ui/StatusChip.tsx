import { Badge } from './Badge';

type LogStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'AMENDED';

const statusVariants: Record<LogStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  PENDING_REVIEW: { label: 'In Review', variant: 'info' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'error' },
  AMENDED: { label: 'Amended', variant: 'warning' },
};

interface StatusChipProps {
  status: string;
}

export function StatusChip({ status }: StatusChipProps) {
  const config = statusVariants[status as LogStatus] ?? {
    label: status,
    variant: 'default' as const,
  };
  return <Badge label={config.label} variant={config.variant} />;
}
