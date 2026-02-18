import { View, Text } from 'react-native';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import { Badge } from '../ui/Badge';
import type { MaterialEntry } from '@/api/endpoints/daily-logs';

const conditionVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  GOOD: 'success',
  DAMAGED: 'error',
  PARTIAL_DELIVERY: 'warning',
  REJECTED: 'error',
};

interface MaterialsSectionProps {
  entries: MaterialEntry[];
}

export function MaterialsSection({ entries }: MaterialsSectionProps) {
  return (
    <View className="gap-3">
      {entries.map((entry) => (
        <View
          key={entry.id}
          className="rounded-lg border border-field-border bg-field-bg p-3"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-field-base font-medium text-field-text">
              {entry.material}
            </Text>
            {entry.aiGenerated && entry.aiConfidence != null && (
              <ConfidenceBadge confidence={entry.aiConfidence} />
            )}
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-field-sm text-field-muted">
              {entry.quantity} {entry.unit}
            </Text>
            <Badge
              label={entry.condition.replace(/_/g, ' ')}
              variant={conditionVariant[entry.condition] ?? 'default'}
            />
          </View>
          {entry.supplier && (
            <Text className="mt-0.5 text-field-sm text-field-muted">
              Supplier: {entry.supplier}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
