import { View, Text, StyleSheet } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: '#e2e8f0', text: '#0f172a' },
  success: { bg: '#dcfce7', text: '#16a34a' },
  warning: { bg: '#fef9c3', text: '#ca8a04' },
  error: { bg: '#fee2e2', text: '#dc2626' },
  info: { bg: '#dbeafe', text: '#2563eb' },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const colors = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});
