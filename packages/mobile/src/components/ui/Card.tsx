import { View } from 'react-native';
import type { ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <View
      className={`rounded-xl border border-field-border bg-field-card p-4 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
