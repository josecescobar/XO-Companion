import { Pressable, Text, ActivityIndicator } from 'react-native';
import type { PressableProps } from 'react-native';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles = {
  primary: 'bg-brand-500',
  secondary: 'bg-field-border',
  danger: 'bg-safety-red',
  ghost: 'bg-transparent',
} as const;

const variantText = {
  primary: 'text-white',
  secondary: 'text-field-text',
  danger: 'text-white',
  ghost: 'text-brand-500',
} as const;

const sizeStyles = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
} as const;

const sizeText = {
  sm: 'text-field-sm',
  md: 'text-field-base',
  lg: 'text-field-lg',
} as const;

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={`items-center rounded-lg ${variantStyles[variant]} ${sizeStyles[size]} ${disabled || loading ? 'opacity-50' : ''}`}
      disabled={disabled || loading}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.8 : undefined })}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? '#2563eb' : '#ffffff'}
          size="small"
        />
      ) : (
        <Text
          className={`font-semibold ${variantText[variant]} ${sizeText[size]}`}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
