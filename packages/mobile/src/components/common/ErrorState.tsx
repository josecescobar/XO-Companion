import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.errorLight }]}>
        <Ionicons name="alert-circle" size={40} color={colors.error} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Error</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  message: { marginTop: 6, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  button: { marginTop: 20, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14, minHeight: 48, justifyContent: 'center' },
  buttonText: { fontWeight: '700', fontSize: 14, color: '#ffffff' },
});
