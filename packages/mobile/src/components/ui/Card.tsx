import { View, StyleSheet, useColorScheme } from 'react-native';
import type { ViewProps, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style, ...props }: CardProps) {
  const { colors, mode } = useTheme();
  const systemScheme = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  return (
    <View
      style={[
        styles.card,
        shadows.md,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 18,
  },
});
