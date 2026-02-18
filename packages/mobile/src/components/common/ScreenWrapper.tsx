import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ViewProps } from 'react-native';

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenWrapper({
  children,
  edges = ['bottom'],
  className = '',
  ...props
}: ScreenWrapperProps) {
  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 bg-field-bg ${className}`}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}
