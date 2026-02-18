import { View, Text, Pressable } from 'react-native';
import { Card } from '../ui/Card';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import { Badge } from '../ui/Badge';
import * as Haptics from 'expo-haptics';
import type { PendingReviewItem } from '@/api/endpoints/reviews';

interface ReviewCardProps {
  item: PendingReviewItem;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}

function formatEntityType(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

function renderValue(value: Record<string, unknown>): string {
  const entries = Object.entries(value)
    .filter(([key]) => !['id', 'dailyLogId', 'createdAt', 'updatedAt', 'aiGenerated', 'aiConfidence'].includes(key))
    .map(([key, val]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      if (Array.isArray(val)) return `${label}: ${val.join(', ')}`;
      return `${label}: ${val}`;
    });
  return entries.join('\n');
}

export function ReviewCard({
  item,
  onApprove,
  onReject,
  disabled,
}: ReviewCardProps) {
  const handleApprove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApprove();
  };

  const handleReject = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onReject();
  };

  return (
    <Card className="mb-3">
      <View className="flex-row items-center justify-between">
        <Badge label={formatEntityType(item.entityType)} variant="info" />
        <ConfidenceBadge confidence={item.aiConfidence} />
      </View>

      <View className="mt-3 rounded-lg bg-field-bg p-3">
        <Text className="text-field-sm text-field-text">
          {renderValue(item.currentValue)}
        </Text>
      </View>

      <View className="mt-3 flex-row gap-3">
        <Pressable
          onPress={handleApprove}
          disabled={disabled}
          className={`flex-1 items-center rounded-lg bg-safety-green py-3 ${disabled ? 'opacity-50' : ''}`}
          style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.8 : undefined })}
        >
          <Text className="font-semibold text-white">Approve</Text>
        </Pressable>

        <Pressable
          onPress={handleReject}
          disabled={disabled}
          className={`flex-1 items-center rounded-lg bg-safety-red py-3 ${disabled ? 'opacity-50' : ''}`}
          style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.8 : undefined })}
        >
          <Text className="font-semibold text-white">Reject</Text>
        </Pressable>
      </View>
    </Card>
  );
}
