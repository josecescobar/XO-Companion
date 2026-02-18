import { View, Text } from 'react-native';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import { Badge } from '../ui/Badge';
import type { DelayEntry } from '@/api/endpoints/daily-logs';

interface DelaysSectionProps {
  entries: DelayEntry[];
}

export function DelaysSection({ entries }: DelaysSectionProps) {
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);

  return (
    <View className="gap-3">
      <Text className="text-field-sm text-field-muted">
        Total delay: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
      </Text>

      {entries.map((entry) => (
        <View
          key={entry.id}
          className="rounded-lg border border-field-border bg-field-bg p-3"
        >
          <View className="flex-row items-center justify-between">
            <Badge label={entry.cause.replace(/_/g, ' ')} variant="warning" />
            {entry.aiGenerated && entry.aiConfidence != null && (
              <ConfidenceBadge confidence={entry.aiConfidence} />
            )}
          </View>
          <Text className="mt-1 text-field-base text-field-text">
            {entry.description}
          </Text>
          <View className="mt-1 flex-row gap-3">
            <Text className="text-field-sm text-field-muted">
              {entry.durationMinutes} min
            </Text>
            {entry.impactedTrades.length > 0 && (
              <Text className="text-field-sm text-field-muted">
                Impacted: {entry.impactedTrades.join(', ')}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
