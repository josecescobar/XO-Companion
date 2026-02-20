import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ConfidenceBadgeProps {
  confidence: number; // 0.0 - 1.0
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { colors } = useTheme();
  const pct = Math.round(confidence * 100);

  const color =
    confidence >= 0.85 ? colors.success : confidence >= 0.6 ? colors.warning : colors.error;
  const bg =
    confidence >= 0.85 ? colors.successLight : confidence >= 0.6 ? colors.warningLight : colors.errorLight;

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
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 13, fontWeight: '700' },
});
