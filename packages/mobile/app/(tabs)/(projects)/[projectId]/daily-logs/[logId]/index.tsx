import { ScrollView, View, Text, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useDailyLog } from '@/hooks/queries/useDailyLogs';
import { useAuthStore } from '@/stores/auth.store';
import { getStatusAction } from '@/lib/permissions';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { CollapsibleSection } from '@/components/daily-log/CollapsibleSection';
import { StatusActionButton } from '@/components/daily-log/StatusActionButton';
import { WeatherSection } from '@/components/daily-log/WeatherSection';
import { WorkforceSection } from '@/components/daily-log/WorkforceSection';
import { EquipmentSection } from '@/components/daily-log/EquipmentSection';
import { WorkCompletedSection } from '@/components/daily-log/WorkCompletedSection';
import { MaterialsSection } from '@/components/daily-log/MaterialsSection';
import { SafetySection } from '@/components/daily-log/SafetySection';
import { DelaysSection } from '@/components/daily-log/DelaysSection';
import { format } from 'date-fns';

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#e2e8f0', text: '#64748b' },
  PENDING_REVIEW: { bg: '#dbeafe', text: '#2563eb' },
  APPROVED: { bg: '#dcfce7', text: '#16a34a' },
  REJECTED: { bg: '#fee2e2', text: '#dc2626' },
  AMENDED: { bg: '#fef3c7', text: '#ca8a04' },
};

export default function DailyLogDetailScreen() {
  const { projectId, logId } = useLocalSearchParams<{ projectId: string; logId: string }>();
  const router = useRouter();
  const { data: log, isLoading, error, refetch, isRefetching } = useDailyLog(projectId, logId);
  const user = useAuthStore((s) => s.user);

  if (isLoading) return <LoadingState message="Loading daily log..." />;
  if (error || !log) return <ErrorState message="Failed to load daily log" onRetry={refetch} />;

  const sc = statusColors[log.status] ?? statusColors.DRAFT;
  const statusAction = getStatusAction(log.status, user?.role);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: format(new Date(log.logDate), 'MMM d, yyyy') }} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{format(new Date(log.logDate), 'EEEE, MMM d, yyyy')}</Text>
            <Text style={styles.author}>
              by {log.createdBy.firstName} {log.createdBy.lastName}
              {log.reportNumber ? ` · Report #${log.reportNumber}` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{log.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {log.notes && <View style={styles.notesBox}><Text style={styles.notesText}>{log.notes}</Text></View>}

        {log.weather && <CollapsibleSection title="Weather" defaultOpen><WeatherSection weather={log.weather} /></CollapsibleSection>}
        {log.workforce.length > 0 && <CollapsibleSection title="Workforce" count={log.workforce.length} defaultOpen><WorkforceSection entries={log.workforce} /></CollapsibleSection>}
        {log.equipment.length > 0 && <CollapsibleSection title="Equipment" count={log.equipment.length}><EquipmentSection entries={log.equipment} /></CollapsibleSection>}
        {log.workCompleted.length > 0 && <CollapsibleSection title="Work Completed" count={log.workCompleted.length}><WorkCompletedSection entries={log.workCompleted} /></CollapsibleSection>}
        {log.materials.length > 0 && <CollapsibleSection title="Materials" count={log.materials.length}><MaterialsSection entries={log.materials} /></CollapsibleSection>}
        {log.safety && <CollapsibleSection title="Safety"><SafetySection safety={log.safety} /></CollapsibleSection>}
        {log.delays.length > 0 && <CollapsibleSection title="Delays" count={log.delays.length}><DelaysSection entries={log.delays} /></CollapsibleSection>}

        {/* Status Action */}
        {statusAction && (
          <View style={styles.actionSection}>
            <StatusActionButton
              action={statusAction}
              projectId={projectId}
              logId={logId}
            />
          </View>
        )}

        {/* Navigation to sub-screens */}
        <View style={styles.navSection}>
          <Pressable
            onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs/${logId}/voice`)}
            style={styles.navButton}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.navButtonTitle}>Voice Notes</Text>
              <Text style={styles.navButtonSub}>{log.voiceNotes.length} note{log.voiceNotes.length !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs/${logId}/review`)}
            style={styles.navButton}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.navButtonTitle}>AI Review</Text>
              <Text style={styles.navButtonSub}>Review extracted data</Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  date: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  author: { fontSize: 14, color: '#64748b', marginTop: 4 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  notesBox: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 12, marginBottom: 16 },
  notesText: { fontSize: 16, color: '#0f172a' },
  actionSection: { marginTop: 16 },
  navSection: { marginTop: 16, gap: 8 },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  navButtonTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  navButtonSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  navArrow: { fontSize: 24, color: '#94a3b8', marginLeft: 8 },
});
