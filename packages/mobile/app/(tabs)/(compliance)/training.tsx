import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { useTrainingRecords } from '@/hooks/queries/useComplianceExtended';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';
import type { TrainingRecord } from '@/api/endpoints/compliance';

export default function TrainingScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useTrainingRecords();
  const { colors } = useTheme();

  if (isLoading) return <LoadingState message="Loading training records..." />;
  if (error) return <ErrorState message="Failed to load training records" onRetry={refetch} />;

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Training Records' }} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.employeeName, { color: colors.text }]}>{item.employeeName}</Text>
              <Badge label={item.trainingType.replace(/_/g, ' ')} variant="info" />
            </View>
            <Text style={[styles.topic, { color: colors.text }]}>{item.topic}</Text>
            <View style={styles.meta}>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Completed: {format(new Date(item.completedDate), 'MMM d, yyyy')}
              </Text>
              {item.expirationDate && (
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  Expires: {format(new Date(item.expirationDate), 'MMM d, yyyy')}
                </Text>
              )}
            </View>
            {item.trainer && (
              <Text style={[styles.trainer, { color: colors.textTertiary }]}>Trainer: {item.trainer}</Text>
            )}
            {item.certificationId && (
              <Text style={[styles.certId, { color: colors.textTertiary }]}>Cert: #{item.certificationId}</Text>
            )}
          </View>
        )}
        ListHeaderComponent={
          <Pressable
            onPress={() => router.push('/(tabs)/(compliance)/add-training')}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addButtonText}>+ Add Training Record</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <EmptyState title="No Training Records" message="No training records have been added yet." icon="📋" />
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  addButton: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  employeeName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  topic: { fontSize: 14, marginBottom: 6 },
  meta: { flexDirection: 'row', gap: 16 },
  metaText: { fontSize: 12 },
  trainer: { fontSize: 12, marginTop: 4 },
  certId: { fontSize: 11, marginTop: 2 },
});
