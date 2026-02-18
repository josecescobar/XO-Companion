import { View, Text, StyleSheet } from 'react-native';

interface ConfidenceBadgeProps {
  confidence: number; // 0.0 - 1.0
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence >= 0.85 ? '#16a34a' : confidence >= 0.6 ? '#ca8a04' : '#dc2626';
  const bg =
    confidence >= 0.85 ? '#dcfce7' : confidence >= 0.6 ? '#fef9c3' : '#fee2e2';

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: { fontSize: 12, fontWeight: '600' },
});
