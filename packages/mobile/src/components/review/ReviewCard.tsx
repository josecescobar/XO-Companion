import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
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
  const { colors } = useTheme();

  const handleApprove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApprove();
  };

  const handleReject = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onReject();
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <Badge label={formatEntityType(item.entityType)} variant="info" />
        <ConfidenceBadge confidence={item.aiConfidence} />
      </View>

      <View style={[styles.valueBox, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.valueText, { color: colors.text }]}>
          {renderValue(item.currentValue)}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleApprove}
          disabled={disabled}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.success },
            disabled && styles.actionDisabled,
            pressed && !disabled && styles.actionPressed,
          ]}
        >
          <Text style={[styles.actionText, { color: colors.surface }]}>Approve</Text>
        </Pressable>

        <Pressable
          onPress={handleReject}
          disabled={disabled}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.error },
            disabled && styles.actionDisabled,
            pressed && !disabled && styles.actionPressed,
          ]}
        >
          <Text style={[styles.actionText, { color: colors.surface }]}>Reject</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueBox: {
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
  },
  valueText: { fontSize: 14 },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 12,
  },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.8 },
  actionText: { fontWeight: '600', fontSize: 16 },
});
