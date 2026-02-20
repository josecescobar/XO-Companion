import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/auth.store';
import { useProjectsOffline } from '@/hooks/queries/useProjectsOffline';
import { useProjectTasksOffline, useTaskSummaryOffline } from '@/hooks/queries/useTasksOffline';
import { useInspectionSummary } from '@/hooks/queries/useInspections';
import { useComplianceAlerts } from '@/hooks/queries/useCompliance';
import { useCommunicationSummary, useProjectCommunications } from '@/hooks/queries/useCommunications';
import { useUpdateTask } from '@/hooks/mutations/useTaskMutations';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { useTheme } from '@/hooks/useTheme';
import type { Task } from '@/api/endpoints/tasks';
import type { CommunicationDetail } from '@/api/endpoints/communications';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: projects, refetch: refetchProjects } = useProjectsOffline();

  const firstProjectId = projects?.[0]?.id ?? '';
  const { data: taskSummary, refetch: refetchSummary } = useTaskSummaryOffline(firstProjectId);
  const { data: allTasks, refetch: refetchTasks } = useProjectTasksOffline(firstProjectId);
  const { data: inspectionSummary, refetch: refetchInspections } = useInspectionSummary(firstProjectId);
  const { data: complianceAlerts, refetch: refetchAlerts } = useComplianceAlerts();
  const { data: commSummary, refetch: refetchComms } = useCommunicationSummary(firstProjectId);
  const { data: draftComms, refetch: refetchDraftComms } = useProjectCommunications(firstProjectId, { status: 'DRAFT' });
  const updateTask = useUpdateTask(firstProjectId);

  const [refreshing, setRefreshing] = useState(false);
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);

  const handleAskXO = () => {
    if (!projects || projects.length === 0) return;
    if (projects.length === 1) {
      router.push(`/(tabs)/(projects)/${projects[0].id}/ask-xo`);
    } else {
      setProjectPickerVisible(true);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchSummary(), refetchTasks(), refetchInspections(), refetchAlerts(), refetchComms(), refetchDraftComms()]);
    setRefreshing(false);
  }, [refetchProjects, refetchSummary, refetchTasks, refetchAlerts]);

  const todaysTasks = useMemo(() => {
    if (!allTasks) return [];
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    return allTasks.filter((t: Task) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      if (!t.dueDate) return false;
      return t.dueDate.substring(0, 10) <= todayStr;
    }).slice(0, 5);
  }, [allTasks]);

  const expiringCount = complianceAlerts?.filter((a: any) => a.severity === 'HIGH' || a.severity === 'CRITICAL').length ?? 0;
  const failedInspections = inspectionSummary?.fail ?? 0;
  const attentionInspections = inspectionSummary?.needsAttention ?? 0;

  const pendingDrafts = commSummary?.draft ?? 0;
  const attentionCount = (taskSummary?.urgent ?? 0) + (taskSummary?.overdue ?? 0) + expiringCount + failedInspections + attentionInspections + pendingDrafts;

  const handleCompleteTask = (task: Task) => {
    updateTask.mutate({ taskId: task.id, body: { status: 'COMPLETED' } });
  };

  const priorityColors: Record<string, string> = {
    URGENT: colors.error,
    HIGH: colors.warning,
    MEDIUM: colors.primary,
    LOW: colors.textTertiary,
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            {getGreeting()}, {user?.firstName || 'there'}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {format(new Date(), 'EEEE, MMM d')}
          </Text>
        </View>

        {/* Ask XO Search Bar */}
        {projects && projects.length > 0 && (
          <Pressable
            onPress={handleAskXO}
            style={[styles.askXoBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={styles.askXoBarIcon}>🤖</Text>
            <Text style={[styles.askXoBarText, { color: colors.textSecondary }]}>
              Ask XO a question...
            </Text>
          </Pressable>
        )}

        {/* Attention Required Card */}
        {attentionCount > 0 && (
          <View style={[styles.attentionCard, { backgroundColor: colors.errorLight }]}>
            <Text style={[styles.attentionTitle, { color: colors.error }]}>
              {attentionCount} item{attentionCount !== 1 ? 's' : ''} need your attention
            </Text>
            <View style={styles.attentionBadges}>
              {(taskSummary?.urgent ?? 0) > 0 && (
                <Pressable
                  onPress={() => firstProjectId && router.push(`/(tabs)/(projects)/${firstProjectId}/tasks`)}
                  style={[styles.attentionBadge, { backgroundColor: colors.error }]}
                >
                  <Text style={styles.attentionBadgeText}>{taskSummary!.urgent} Urgent</Text>
                </Pressable>
              )}
              {(taskSummary?.overdue ?? 0) > 0 && (
                <Pressable
                  onPress={() => firstProjectId && router.push(`/(tabs)/(projects)/${firstProjectId}/tasks`)}
                  style={[styles.attentionBadge, { backgroundColor: colors.warning }]}
                >
                  <Text style={styles.attentionBadgeText}>{taskSummary!.overdue} Overdue</Text>
                </Pressable>
              )}
              {failedInspections > 0 && (
                <Pressable
                  onPress={() => firstProjectId && router.push(`/(tabs)/(projects)/${firstProjectId}/inspections`)}
                  style={[styles.attentionBadge, { backgroundColor: colors.error }]}
                >
                  <Text style={styles.attentionBadgeText}>{failedInspections} Failed Inspections</Text>
                </Pressable>
              )}
              {attentionInspections > 0 && (
                <Pressable
                  onPress={() => firstProjectId && router.push(`/(tabs)/(projects)/${firstProjectId}/inspections`)}
                  style={[styles.attentionBadge, { backgroundColor: '#D97706' }]}
                >
                  <Text style={styles.attentionBadgeText}>{attentionInspections} Need Attention</Text>
                </Pressable>
              )}
              {expiringCount > 0 && (
                <Pressable
                  onPress={() => router.push('/(tabs)/(compliance)' as any)}
                  style={[styles.attentionBadge, { backgroundColor: colors.warning }]}
                >
                  <Text style={styles.attentionBadgeText}>{expiringCount} Expiring</Text>
                </Pressable>
              )}
              {pendingDrafts > 0 && (
                <Pressable
                  onPress={() => firstProjectId && router.push(`/(tabs)/(projects)/${firstProjectId}/communications` as any)}
                  style={[styles.attentionBadge, { backgroundColor: '#2563eb' }]}
                >
                  <Text style={styles.attentionBadgeText}>{pendingDrafts} Drafts Ready</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions Row */}
        <View style={styles.quickActions}>
          <Pressable
            onPress={() => router.push('/(tabs)/(record)')}
            style={[styles.quickAction, { backgroundColor: colors.primaryLight }]}
          >
            <Text style={styles.quickActionIcon}>🎙️</Text>
            <Text style={[styles.quickActionLabel, { color: colors.primary }]}>Record</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/(projects)')}
            style={[styles.quickAction, { backgroundColor: colors.successLight }]}
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={[styles.quickActionLabel, { color: colors.success }]}>New Log</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/(compliance)/incidents/new' as any)}
            style={[styles.quickAction, { backgroundColor: colors.errorLight }]}
          >
            <Text style={styles.quickActionIcon}>🛡️</Text>
            <Text style={[styles.quickActionLabel, { color: colors.error }]}>Incident</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/(reviews)')}
            style={[styles.quickAction, { backgroundColor: colors.warningLight }]}
          >
            <Text style={styles.quickActionIcon}>✅</Text>
            <Text style={[styles.quickActionLabel, { color: colors.warning }]}>Reviews</Text>
          </Pressable>
        </View>

        {/* Today's Tasks */}
        {todaysTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Tasks</Text>
              {firstProjectId ? (
                <Pressable onPress={() => router.push(`/(tabs)/(projects)/${firstProjectId}/tasks`)}>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
                </Pressable>
              ) : null}
            </View>
            {todaysTasks.map((task: Task) => (
              <View
                key={task.id}
                style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.priorityBar, { backgroundColor: priorityColors[task.priority] ?? colors.border }]} />
                <Pressable
                  onPress={() => handleCompleteTask(task)}
                  style={[styles.checkbox, { borderColor: colors.border }]}
                >
                  {task.status === 'COMPLETED' && <Text style={{ color: colors.success }}>✓</Text>}
                </Pressable>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskDescription, { color: colors.text }]} numberOfLines={2}>
                    {task.description}
                  </Text>
                  <View style={styles.taskMeta}>
                    {task.dueDate && (
                      <Text style={[styles.taskMetaText, { color: colors.textTertiary }]}>
                        Due {format(new Date(task.dueDate), 'MMM d')}
                      </Text>
                    )}
                    {task.aiGenerated && <Text style={styles.aiIcon}>🤖</Text>}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending Drafts */}
        {draftComms && draftComms.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Drafts</Text>
              {firstProjectId ? (
                <Pressable onPress={() => router.push(`/(tabs)/(projects)/${firstProjectId}/communications` as any)}>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
                </Pressable>
              ) : null}
            </View>
            {draftComms.slice(0, 3).map((comm: CommunicationDetail) => {
              const typeIcons: Record<string, string> = {
                EMAIL: '\u{1F4E7}', TEXT: '\u{1F4AC}', CALL: '\u{1F4DE}', RFI: '\u{2753}', CHANGE_ORDER: '\u{1F504}',
              };
              return (
                <Pressable
                  key={comm.id}
                  onPress={() => router.push(`/(tabs)/(projects)/${firstProjectId}/communications/${comm.id}` as any)}
                  style={[styles.draftCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={styles.draftTypeIcon}>{typeIcons[comm.type] ?? '\u{2709}\u{FE0F}'}</Text>
                  <View style={styles.draftCardContent}>
                    <Text style={[styles.draftSubject, { color: colors.text }]} numberOfLines={1}>{comm.subject}</Text>
                    <Text style={[styles.draftRecipient, { color: colors.textSecondary }]} numberOfLines={1}>To: {comm.recipient}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Task Summary Stats */}
        {taskSummary && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{taskSummary.pending}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.error }]}>{taskSummary.urgent}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Urgent</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.success }]}>{taskSummary.completedThisWeek}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done This Week</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.warning }]}>{taskSummary.overdue}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
            </View>
          </View>
        )}

        {/* Active Projects */}
        {projects && projects.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Projects</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectScroll}>
              {projects.filter((p) => p.isActive).map((project) => (
                <Pressable
                  key={project.id}
                  onPress={() => router.push(`/(tabs)/(projects)/${project.id}`)}
                  style={[styles.projectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text style={[styles.projectCode, { color: colors.textSecondary }]}>{project.code}</Text>
                  <View style={styles.projectStats}>
                    <Text style={[styles.projectStat, { color: colors.textTertiary }]}>
                      {project.members?.length ?? project._count?.members ?? 0} members
                    </Text>
                    <Text style={[styles.projectStat, { color: colors.textTertiary }]}>
                      {project._count?.dailyLogs ?? 0} logs
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          {allTasks && allTasks.length > 0 ? (
            allTasks
              .filter((t: Task) => t.status === 'COMPLETED')
              .slice(0, 3)
              .map((task: Task) => (
                <View key={task.id} style={[styles.activityRow, { borderColor: colors.border }]}>
                  <View style={[styles.activityDot, { backgroundColor: colors.success }]} />
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={1}>
                      {task.description}
                    </Text>
                    <Text style={[styles.activityTime, { color: colors.textTertiary }]}>
                      Completed {task.completedAt ? format(new Date(task.completedAt), 'MMM d') : 'recently'}
                    </Text>
                  </View>
                </View>
              ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent activity</Text>
          )}
        </View>
      </ScrollView>

      {/* Project Picker Modal for Ask XO */}
      <Modal visible={projectPickerVisible} animationType="fade" transparent>
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setProjectPickerVisible(false)}
        >
          <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Which project?
            </Text>
            {projects?.filter((p) => p.isActive).map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  setProjectPickerVisible(false);
                  router.push(`/(tabs)/(projects)/${p.id}/ask-xo`);
                }}
                style={[styles.pickerItem, { borderColor: colors.border }]}
              >
                <Text style={[styles.pickerItemText, { color: colors.text }]}>
                  {p.name}
                </Text>
                <Text style={[styles.pickerItemCode, { color: colors.textSecondary }]}>
                  {p.code}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700' },
  date: { fontSize: 15, marginTop: 4 },
  // Attention card
  attentionCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  attentionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  attentionBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attentionBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  attentionBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  // Quick actions
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickAction: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 },
  quickActionIcon: { fontSize: 24 },
  quickActionLabel: { fontSize: 12, fontWeight: '600' },
  // Sections
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  viewAll: { fontSize: 14, fontWeight: '500' },
  // Task cards
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  priorityBar: { width: 4, alignSelf: 'stretch' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  taskContent: { flex: 1, paddingVertical: 12, paddingRight: 12 },
  taskDescription: { fontSize: 15, fontWeight: '500' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  taskMetaText: { fontSize: 12 },
  aiIcon: { fontSize: 14 },
  // Stats row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  // Projects
  projectScroll: { gap: 10 },
  projectCard: {
    width: 160,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  projectName: { fontSize: 15, fontWeight: '600' },
  projectCode: { fontSize: 12, marginTop: 2 },
  projectStats: { flexDirection: 'row', gap: 8, marginTop: 10 },
  projectStat: { fontSize: 11 },
  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14 },
  activityTime: { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  // Draft cards
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  draftTypeIcon: { fontSize: 20 },
  draftCardContent: { flex: 1 },
  draftSubject: { fontSize: 14, fontWeight: '600' },
  draftRecipient: { fontSize: 12, marginTop: 2 },
  // Ask XO bar
  askXoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  askXoBarIcon: { fontSize: 20 },
  askXoBarText: { fontSize: 16, fontWeight: '500' },
  // Project picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 32,
  },
  pickerSheet: { borderRadius: 16, padding: 20, gap: 8 },
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  pickerItem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemText: { fontSize: 16, fontWeight: '600' },
  pickerItemCode: { fontSize: 13 },
});
