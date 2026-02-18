import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { PressableProps } from 'react-native';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantBg = {
  primary: '#2563eb',
  secondary: '#e2e8f0',
  danger: '#dc2626',
  ghost: 'transparent',
} as const;

const variantTextColor = {
  primary: '#ffffff',
  secondary: '#0f172a',
  danger: '#ffffff',
  ghost: '#2563eb',
} as const;

const sizePadding = {
  sm: { paddingHorizontal: 12, paddingVertical: 8 },
  md: { paddingHorizontal: 16, paddingVertical: 12 },
  lg: { paddingHorizontal: 24, paddingVertical: 16 },
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
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: variantBg[variant] },
        sizePadding[size],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? '#2563eb' : '#ffffff'}
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
  base: { alignItems: 'center', borderRadius: 8 },
  text: { fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
