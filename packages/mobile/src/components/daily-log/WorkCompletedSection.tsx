import { View, Text } from 'react-native';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import type { WorkCompletedEntry } from '@/api/endpoints/daily-logs';

interface WorkCompletedSectionProps {
  entries: WorkCompletedEntry[];
}

export function WorkCompletedSection({ entries }: WorkCompletedSectionProps) {
  return (
    <View className="gap-3">
      {entries.map((entry) => (
        <View
          key={entry.id}
          className="rounded-lg border border-field-border bg-field-bg p-3"
        >
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-field-base font-medium text-field-text">
              {entry.location}
            </Text>
            {entry.aiGenerated && entry.aiConfidence != null && (
              <ConfidenceBadge confidence={entry.aiConfidence} />
            )}
          </View>
          <Text className="mt-1 text-field-sm text-field-text">
            {entry.description}
          </Text>
          <View className="mt-1 flex-row gap-4">
            {entry.percentComplete != null && (
              <Text className="text-field-sm text-field-muted">
                {entry.percentComplete}% complete
              </Text>
            )}
            {entry.quantity != null && entry.unit && (
              <Text className="text-field-sm text-field-muted">
                {entry.quantity} {entry.unit}
              </Text>
            )}
            {entry.csiCode && (
              <Text className="text-field-sm text-field-muted">
                CSI {entry.csiCode}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
