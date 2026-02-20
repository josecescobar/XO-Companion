import { useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useDailyLogsOffline } from '@/hooks/queries/useDailyLogsOffline';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusChip } from '@/components/ui/StatusChip';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
import { format } from 'date-fns';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'In Review', value: 'PENDING_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
] as const;

export default function DailyLogsListScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data: logs, isLoading, error, refetch } = useDailyLogsOffline(
    projectId,
    statusFilter,
  );
  const { colors } = useTheme();

  if (isLoading) return <LoadingState message="Loading daily logs..." />;
  if (error) return <ErrorState message="Failed to load daily logs" onRetry={refetch} />;

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Daily Logs' }} />

      {/* Status Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
        {STATUS_FILTERS.map((filter) => (
          <Pressable
            key={filter.label}
            onPress={() => setStatusFilter(filter.value)}
            style={[
              styles.filterChip,
              statusFilter === filter.value
                ? [styles.filterSelected, { backgroundColor: colors.primary }]
                : [styles.filterDefault, shadows.sm, { backgroundColor: colors.surface }],
            ]}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === filter.value
                  ? styles.filterTextSelected
                  : [styles.filterTextDefault, { color: colors.textSecondary }],
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
        </ScrollView>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push(
                `/(tabs)/(projects)/${projectId}/daily-logs/${item.id}`,
              )
            }
          >
            <View style={[styles.logCard, shadows.md, { backgroundColor: colors.surface }]}>
              <View style={styles.logHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.logDate, { color: colors.text }]}>
                    {format(new Date(item.logDate), 'EEEE, MMM d, yyyy')}
                  </Text>
                  <Text style={[styles.logAuthor, { color: colors.textSecondary }]}>
                    by {item.createdBy.firstName} {item.createdBy.lastName}
                  </Text>
                </View>
                <StatusChip status={item.status} />
              </View>

              <View style={styles.statsRow}>
                {item._count.workforce > 0 && (
                  <Text style={[styles.stat, { color: colors.textSecondary }]}>{item._count.workforce} crews</Text>
                )}
                {item._count.equipment > 0 && (
                  <Text style={[styles.stat, { color: colors.textSecondary }]}>{item._count.equipment} equipment</Text>
                )}
                {item._count.workCompleted > 0 && (
                  <Text style={[styles.stat, { color: colors.textSecondary }]}>{item._count.workCompleted} work items</Text>
                )}
                {item._count.voiceNotes > 0 && (
                  <Text style={[styles.stat, { color: colors.textSecondary }]}>{item._count.voiceNotes} voice notes</Text>
                )}
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No Daily Logs"
            message={
              statusFilter
                ? `No logs with status "${statusFilter}"`
                : 'No daily logs have been created yet.'
            }
            icon="document-text-outline"
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      />
      {/* FAB to create new log */}
      <Pressable
        onPress={() =>
          router.push(`/(tabs)/(projects)/${projectId}/daily-logs/new`)
        }
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filterContainer: { flexShrink: 0, paddingHorizontal: 16, paddingVertical: 12 },
  filterRow: { gap: 8 },
  filterChip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center' as const },
  filterSelected: {},
  filterDefault: {},
  filterText: { fontSize: 14, fontWeight: '600' },
  filterTextSelected: { color: '#ffffff' },
  filterTextDefault: {},
  logCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logDate: { fontSize: 16, fontWeight: '700' },
  logAuthor: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  stat: { fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '700',
    lineHeight: 30,
  },
});
