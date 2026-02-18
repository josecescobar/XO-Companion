import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useProject } from '@/hooks/queries/useProjects';
import { useDailyLogs } from '@/hooks/queries/useDailyLogs';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { format } from 'date-fns';

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#e2e8f0', text: '#64748b' },
  PENDING_REVIEW: { bg: '#dbeafe', text: '#2563eb' },
  APPROVED: { bg: '#dcfce7', text: '#16a34a' },
  REJECTED: { bg: '#fee2e2', text: '#dc2626' },
  AMENDED: { bg: '#fef3c7', text: '#ca8a04' },
};

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const { data: logs, refetch: refetchLogs, isRefetching } = useDailyLogs(projectId);

  if (isLoading) return <LoadingState message="Loading project..." />;
  if (error || !project) return <ErrorState message="Failed to load project" onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: project.name }} />
      <FlatList
        data={logs?.slice(0, 10) ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Project Header Card */}
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.projectName}>{project.name}</Text>
                <View style={[styles.badge, project.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, { color: project.isActive ? '#16a34a' : '#64748b' }]}>
                    {project.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text style={styles.code}>{project.code}</Text>
              {(project.city || project.state) && (
                <Text style={styles.location}>
                  {[project.address, project.city, project.state].filter(Boolean).join(', ')}
                </Text>
              )}
              <View style={styles.statsRow}>
                <Text style={styles.stat}>{project.members.length} members</Text>
                <Text style={styles.stat}>{project._count.dailyLogs} daily logs</Text>
              </View>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Daily Logs</Text>
              <Pressable onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs`)}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const sc = statusColors[item.status] ?? statusColors.DRAFT;
          return (
            <Pressable
              onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs/${item.id}`)}
              style={({ pressed }) => [styles.logCard, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.row}>
                <Text style={styles.logDate}>{format(new Date(item.logDate), 'MMM d, yyyy')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <View style={styles.logStats}>
                {item._count.workforce > 0 && <Text style={styles.stat}>{item._count.workforce} crews</Text>}
                {item._count.voiceNotes > 0 && <Text style={styles.stat}>{item._count.voiceNotes} voice notes</Text>}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No daily logs yet</Text>}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchLogs(); }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectName: { fontSize: 20, fontWeight: '700', color: '#0f172a', flex: 1 },
  code: { fontSize: 14, color: '#64748b', marginTop: 2 },
  location: { fontSize: 14, color: '#64748b', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { fontSize: 14, color: '#64748b' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#e2e8f0' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  viewAll: { fontSize: 14, fontWeight: '500', color: '#2563eb' },
  logCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 8 },
  logDate: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  logStats: { flexDirection: 'row', gap: 12, marginTop: 8 },
  empty: { fontSize: 16, color: '#64748b', textAlign: 'center', paddingVertical: 32 },
});
