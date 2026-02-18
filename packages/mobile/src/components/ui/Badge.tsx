import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-field-border', text: 'text-field-text' },
  success: { bg: 'bg-green-100', text: 'text-safety-green' },
  warning: { bg: 'bg-yellow-100', text: 'text-safety-yellow' },
  error: { bg: 'bg-red-100', text: 'text-safety-red' },
  info: { bg: 'bg-blue-100', text: 'text-brand-500' },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const styles = variantStyles[variant];
  return (
    <View className={`rounded-full px-3 py-1 ${styles.bg}`}>
      <Text className={`text-xs font-semibold ${styles.text}`}>{label}</Text>
    </View>
  );
}
