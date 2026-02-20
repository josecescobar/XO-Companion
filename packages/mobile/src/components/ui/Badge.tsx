import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const { colors } = useTheme();

  const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
    default: { bg: colors.border, text: colors.text },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    error: { bg: colors.errorLight, text: colors.error },
    info: { bg: colors.primaryLight, text: colors.primary },
  };

  const badgeColors = variantColors[variant];

  return (
    <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
      <Text style={[styles.text, { color: badgeColors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  text: { fontSize: 13, fontWeight: '700' },
});
