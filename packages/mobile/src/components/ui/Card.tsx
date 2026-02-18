import { View, StyleSheet } from 'react-native';
import type { ViewProps, StyleProp, ViewStyle } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
  },
});
