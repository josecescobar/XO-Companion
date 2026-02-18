import { View, Text } from 'react-native';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import { Badge } from '../ui/Badge';
import type { EquipmentEntry } from '@/api/endpoints/daily-logs';

const conditionVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  OPERATIONAL: 'success',
  NEEDS_MAINTENANCE: 'warning',
  DOWN_FOR_REPAIR: 'error',
  IDLE: 'default',
};

interface EquipmentSectionProps {
  entries: EquipmentEntry[];
}

export function EquipmentSection({ entries }: EquipmentSectionProps) {
  return (
    <View className="gap-3">
      {entries.map((entry) => (
        <View
          key={entry.id}
          className="rounded-lg border border-field-border bg-field-bg p-3"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-field-base font-medium text-field-text">
              {entry.equipmentType}
            </Text>
            {entry.aiGenerated && entry.aiConfidence != null && (
              <ConfidenceBadge confidence={entry.aiConfidence} />
            )}
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            <Badge
              label={entry.condition.replace(/_/g, ' ')}
              variant={conditionVariant[entry.condition] ?? 'default'}
            />
            <Text className="text-field-sm text-field-muted">
              {entry.operatingHours}h operating
              {entry.idleHours > 0 ? `, ${entry.idleHours}h idle` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
