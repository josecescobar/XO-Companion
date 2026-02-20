import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { PressableProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const sizePadding = {
  sm: { paddingHorizontal: 16, paddingVertical: 10 },
  md: { paddingHorizontal: 20, paddingVertical: 14 },
  lg: { paddingHorizontal: 28, paddingVertical: 18 },
} as const;

const sizeFont = {
  sm: 14,
  md: 16,
  lg: 18,
} as const;

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const hasShadow = variant === 'primary' || variant === 'danger';

  const variantBg = {
    primary: colors.primary,
    secondary: colors.surfaceSecondary,
    danger: colors.error,
    ghost: 'transparent',
  } as const;

  const variantTextColor = {
    primary: '#ffffff',
    secondary: colors.text,
    danger: '#ffffff',
    ghost: colors.primary,
  } as const;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: variantBg[variant] },
        sizePadding[size],
        hasShadow && shadows.sm,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? colors.primary : '#ffffff'}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            { color: variantTextColor[variant], fontSize: sizeFont[size] },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: 10 },
  text: { fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
