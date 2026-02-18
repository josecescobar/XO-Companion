import { View, Text, Pressable, StyleSheet } from 'react-native';

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  action: { fontSize: 14, fontWeight: '500', color: '#2563eb' },
});
