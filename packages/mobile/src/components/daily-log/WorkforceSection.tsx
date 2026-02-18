import { View, Text } from 'react-native';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import type { WorkforceEntry } from '@/api/endpoints/daily-logs';

interface WorkforceSectionProps {
  entries: WorkforceEntry[];
}

export function WorkforceSection({ entries }: WorkforceSectionProps) {
  const totalWorkers = entries.reduce((sum, e) => sum + e.workerCount, 0);
  const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked * e.workerCount, 0);

  return (
    <View className="gap-3">
      <View className="flex-row gap-4">
        <Text className="text-field-sm text-field-muted">
          Total: {totalWorkers} workers, {totalHours} man-hours
        </Text>
      </View>

      {entries.map((entry) => (
        <View
          key={entry.id}
          className="rounded-lg border border-field-border bg-field-bg p-3"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-field-base font-medium text-field-text">
              {entry.trade}
            </Text>
            {entry.aiGenerated && entry.aiConfidence != null && (
              <ConfidenceBadge confidence={entry.aiConfidence} />
            )}
          </View>
          <Text className="mt-0.5 text-field-sm text-field-muted">
            {entry.company}
          </Text>
          <View className="mt-1 flex-row gap-4">
            <Text className="text-field-sm text-field-muted">
              {entry.workerCount} workers
            </Text>
            <Text className="text-field-sm text-field-muted">
              {entry.hoursWorked}h
              {entry.overtimeHours > 0 ? ` (+${entry.overtimeHours}h OT)` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
