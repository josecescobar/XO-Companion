import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ViewProps, StyleProp, ViewStyle } from 'react-native';

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: StyleProp<ViewStyle>;
}

export function ScreenWrapper({
  children,
  edges = ['bottom'],
  style,
  ...props
}: ScreenWrapperProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.container, style]} {...props}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
});
