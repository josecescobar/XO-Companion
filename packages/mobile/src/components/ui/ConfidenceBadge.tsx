import { View, Text } from 'react-native';

interface ConfidenceBadgeProps {
  confidence: number; // 0.0 - 1.0
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence >= 0.85
      ? 'text-safety-green'
      : confidence >= 0.6
        ? 'text-safety-yellow'
        : 'text-safety-red';
  const bg =
    confidence >= 0.85
      ? 'bg-green-100'
      : confidence >= 0.6
        ? 'bg-yellow-100'
        : 'bg-red-100';

  return (
    <View className={`flex-row items-center rounded-full px-2 py-0.5 ${bg}`}>
      <Text className={`text-xs font-semibold ${color}`}>{pct}%</Text>
    </View>
  );
}
