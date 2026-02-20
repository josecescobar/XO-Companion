import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useProject } from '@/hooks/queries/useProjects';
import { useDailyLogs } from '@/hooks/queries/useDailyLogs';
import { useMemoryStats } from '@/hooks/queries/useMemoryStats';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { CollapsibleSection } from '@/components/daily-log/CollapsibleSection';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';

function formatRole(role: string): string {
  return role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const { data: logs, refetch: refetchLogs, isRefetching } = useDailyLogs(projectId);
  const { data: memoryStats } = useMemoryStats(projectId);
  const { colors } = useTheme();

  const statusColors: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: colors.border, text: colors.textSecondary },
    PENDING_REVIEW: { bg: colors.primaryLight, text: colors.primary },
    APPROVED: { bg: colors.successLight, text: colors.success },
    REJECTED: { bg: colors.errorLight, text: colors.error },
    AMENDED: { bg: colors.warningLight, text: colors.warning },
  };

  if (isLoading) return <LoadingState message="Loading project..." />;
  if (error || !project) return <ErrorState message="Failed to load project" onRetry={refetch} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: project.name }} />
      <FlatList
        data={logs?.slice(0, 10) ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Project Header Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[styles.projectName, { color: colors.text }]}>{project.name}</Text>
                <View style={[styles.badge, { backgroundColor: project.isActive ? colors.successLight : colors.border }]}>
                  <Text style={[styles.badgeText, { color: project.isActive ? colors.success : colors.textSecondary }]}>
                    {project.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.code, { color: colors.textSecondary }]}>{project.code}</Text>
              {(project.city || project.state) && (
                <Text style={[styles.location, { color: colors.textSecondary }]}>
                  {[project.address, project.city, project.state].filter(Boolean).join(', ')}
                </Text>
              )}
              <View style={styles.statsRow}>
                <Text style={[styles.stat, { color: colors.textSecondary }]}>{project.members.length} members</Text>
                <Text style={[styles.stat, { color: colors.textSecondary }]}>{project._count?.dailyLogs ?? 0} daily logs</Text>
              </View>
            </View>

            {/* Team Section */}
            <CollapsibleSection title="Team" count={project.members.length}>
              {project.members.map((member) => (
                <View key={member.userId} style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.memberAvatarText, { color: colors.primary }]}>
                      {member.user.firstName?.charAt(0) ?? ''}{member.user.lastName?.charAt(0) ?? ''}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.user.firstName} {member.user.lastName}
                    </Text>
                    <View style={[styles.memberRoleBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.memberRoleText, { color: colors.primary }]}>{formatRole(member.role)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </CollapsibleSection>

            {/* Ask XO Card */}
            <Pressable
              onPress={() => router.push(`/(tabs)/(projects)/${projectId}/ask-xo`)}
              style={[styles.askXoCard, { backgroundColor: colors.primary }]}
            >
              <View style={styles.askXoContent}>
                <Text style={styles.askXoIcon}>🤖</Text>
                <View style={styles.askXoText}>
                  <Text style={styles.askXoTitle}>Ask XO anything about this project</Text>
                  <Text style={styles.askXoSubtitle}>Search documents, logs, and project history</Text>
                </View>
                <Text style={styles.askXoArrow}>›</Text>
              </View>
            </Pressable>

            {/* Memory Stats */}
            {memoryStats && memoryStats.totalChunks > 0 && (
              <View style={[styles.memoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.memoryLabel, { color: colors.textSecondary }]}>
                  Project Memory: {memoryStats.totalChunks} chunks indexed · {memoryStats.embeddedChunks} embedded
                  {memoryStats.bySourceType.find((s) => s.sourceType === 'DOCUMENT')
                    ? ` · ${memoryStats.bySourceType.find((s) => s.sourceType === 'DOCUMENT')!.count} from documents`
                    : ''}
                </Text>
              </View>
            )}

            {/* AI Inspect — Killer Feature */}
            <Pressable
              onPress={() => router.push(`/(tabs)/(projects)/${projectId}/inspections`)}
              style={[styles.inspectCard, { backgroundColor: '#7C3AED' }]}
            >
              <View style={styles.askXoContent}>
                <Text style={styles.askXoIcon}>{'\u{1F50D}'}</Text>
                <View style={styles.askXoText}>
                  <Text style={styles.askXoTitle}>AI Vision Inspection</Text>
                  <Text style={styles.askXoSubtitle}>Photo vs. drawings, specs & safety standards</Text>
                </View>
                <Text style={styles.askXoArrow}>{'\u{203A}'}</Text>
              </View>
            </Pressable>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Pressable
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/analytics`)}
                style={[styles.actionCard, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              >
                <Text style={styles.actionIcon}>{'\u{1F4CA}'}</Text>
                <Text style={[styles.actionLabel, { color: colors.primary }]}>Analytics</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/tasks`)}
                style={[styles.actionCard, { backgroundColor: colors.errorLight, borderColor: colors.border }]}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={[styles.actionLabel, { color: colors.error }]}>Tasks</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/team`)}
                style={[styles.actionCard, { backgroundColor: colors.warningLight, borderColor: colors.border }]}
              >
                <Text style={styles.actionIcon}>👥</Text>
                <Text style={[styles.actionLabel, { color: colors.warning }]}>Team</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs`)}
                style={[styles.actionCard, { backgroundColor: colors.successLight, borderColor: colors.border }]}
              >
                <Text style={styles.actionIcon}>📝</Text>
                <Text style={[styles.actionLabel, { color: colors.success }]}>All Logs</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/reports`)}
                style={[styles.actionCard, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              >
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={[styles.actionLabel, { color: colors.primary }]}>Report</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/documents`)}
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={styles.actionIcon}>📄</Text>
                <Text style={[styles.actionLabel, { color: colors.text }]}>Documents</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/communications` as any)}
                style={[styles.actionCard, { backgroundColor: '#dbeafe', borderColor: colors.border }]}
              >
                <Text style={styles.actionIcon}>✉️</Text>
                <Text style={[styles.actionLabel, { color: '#2563eb' }]}>Comms</Text>
              </Pressable>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Daily Logs</Text>
              <Pressable onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs`)}>
                <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const sc = statusColors[item.status] ?? statusColors.DRAFT;
          return (
            <Pressable
              onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs/${item.id}`)}
              style={({ pressed }) => [styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.row}>
                <Text style={[styles.logDate, { color: colors.text }]}>{format(new Date(item.logDate), 'MMM d, yyyy')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <View style={styles.logStats}>
                {item._count.workforce > 0 && <Text style={[styles.stat, { color: colors.textSecondary }]}>{item._count.workforce} crews</Text>}
                {item._count.voiceNotes > 0 && <Text style={[styles.stat, { color: colors.textSecondary }]}>{item._count.voiceNotes} voice notes</Text>}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No daily logs yet</Text>}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchLogs(); }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectName: { fontSize: 20, fontWeight: '700', flex: 1 },
  code: { fontSize: 14, marginTop: 2 },
  location: { fontSize: 14, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { fontSize: 14 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  inspectCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  askXoCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  askXoContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  askXoIcon: { fontSize: 28 },
  askXoText: { flex: 1 },
  askXoTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  askXoSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  askXoArrow: { color: '#fff', fontSize: 28, fontWeight: '300' },
  memoryCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12 },
  memoryLabel: { fontSize: 13 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  actionCard: { flexBasis: '30%', flexGrow: 1, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  viewAll: { fontSize: 14, fontWeight: '500' },
  logCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  logDate: { fontSize: 16, fontWeight: '600' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  logStats: { flexDirection: 'row', gap: 12, marginTop: 8 },
  empty: { fontSize: 16, textAlign: 'center', paddingVertical: 32 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 13, fontWeight: '700' },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberRoleBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  memberRoleText: { fontSize: 11, fontWeight: '600' },
});
