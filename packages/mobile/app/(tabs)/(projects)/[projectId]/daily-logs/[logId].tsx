import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useDailyLog } from '@/hooks/queries/useDailyLogs';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusChip } from '@/components/ui/StatusChip';
import { CollapsibleSection } from '@/components/daily-log/CollapsibleSection';
import { WeatherSection } from '@/components/daily-log/WeatherSection';
import { WorkforceSection } from '@/components/daily-log/WorkforceSection';
import { EquipmentSection } from '@/components/daily-log/EquipmentSection';
import { WorkCompletedSection } from '@/components/daily-log/WorkCompletedSection';
import { MaterialsSection } from '@/components/daily-log/MaterialsSection';
import { SafetySection } from '@/components/daily-log/SafetySection';
import { DelaysSection } from '@/components/daily-log/DelaysSection';
import { format } from 'date-fns';

export default function DailyLogDetailScreen() {
  const { projectId, logId } = useLocalSearchParams<{
    projectId: string;
    logId: string;
  }>();
  const { data: log, isLoading, error, refetch, isRefetching } = useDailyLog(
    projectId,
    logId,
  );

  if (isLoading) return <LoadingState message="Loading daily log..." />;
  if (error || !log) return <ErrorState message="Failed to load daily log" onRetry={refetch} />;

  return (
    <ScreenWrapper>
      <Stack.Screen
        options={{ title: format(new Date(log.logDate), 'MMM d, yyyy') }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-field-xl font-bold text-field-text">
              {format(new Date(log.logDate), 'EEEE, MMM d, yyyy')}
            </Text>
            <Text className="mt-0.5 text-field-sm text-field-muted">
              by {log.createdBy.firstName} {log.createdBy.lastName}
              {log.reportNumber ? ` • Report #${log.reportNumber}` : ''}
            </Text>
          </View>
          <StatusChip status={log.status} />
        </View>

        {log.notes && (
          <View className="mb-4 rounded-lg bg-brand-50 p-3">
            <Text className="text-field-base text-field-text">{log.notes}</Text>
          </View>
        )}

        {/* Sections */}
        {log.weather && (
          <CollapsibleSection title="Weather" defaultOpen>
            <WeatherSection weather={log.weather} />
          </CollapsibleSection>
        )}

        {log.workforce.length > 0 && (
          <CollapsibleSection
            title="Workforce"
            count={log.workforce.length}
            defaultOpen
          >
            <WorkforceSection entries={log.workforce} />
          </CollapsibleSection>
        )}

        {log.equipment.length > 0 && (
          <CollapsibleSection
            title="Equipment"
            count={log.equipment.length}
          >
            <EquipmentSection entries={log.equipment} />
          </CollapsibleSection>
        )}

        {log.workCompleted.length > 0 && (
          <CollapsibleSection
            title="Work Completed"
            count={log.workCompleted.length}
          >
            <WorkCompletedSection entries={log.workCompleted} />
          </CollapsibleSection>
        )}

        {log.materials.length > 0 && (
          <CollapsibleSection
            title="Materials"
            count={log.materials.length}
          >
            <MaterialsSection entries={log.materials} />
          </CollapsibleSection>
        )}

        {log.safety && (
          <CollapsibleSection title="Safety">
            <SafetySection safety={log.safety} />
          </CollapsibleSection>
        )}

        {log.delays.length > 0 && (
          <CollapsibleSection
            title="Delays"
            count={log.delays.length}
          >
            <DelaysSection entries={log.delays} />
          </CollapsibleSection>
        )}

        {/* Voice Notes Summary */}
        {log.voiceNotes.length > 0 && (
          <CollapsibleSection
            title="Voice Notes"
            count={log.voiceNotes.length}
          >
            <View className="gap-2">
              {log.voiceNotes.map((note) => (
                <View
                  key={note.id}
                  className="flex-row items-center justify-between rounded-lg border border-field-border bg-field-bg p-3"
                >
                  <Text className="text-field-base text-field-text">
                    {note.durationSeconds
                      ? `${Math.floor(note.durationSeconds / 60)}:${String(note.durationSeconds % 60).padStart(2, '0')}`
                      : 'Unknown duration'}
                  </Text>
                  <Text className="text-field-sm text-field-muted">
                    {note.status}
                  </Text>
                </View>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {/* Signatures */}
        {log.signatures.length > 0 && (
          <CollapsibleSection
            title="Signatures"
            count={log.signatures.length}
          >
            <View className="gap-2">
              {log.signatures.map((sig) => (
                <View
                  key={sig.id}
                  className="flex-row items-center justify-between rounded-lg border border-field-border bg-field-bg p-3"
                >
                  <View>
                    <Text className="text-field-base font-medium text-field-text">
                      {sig.user.firstName} {sig.user.lastName}
                    </Text>
                    <Text className="text-field-sm text-field-muted">
                      {sig.role}
                    </Text>
                  </View>
                  <Text className="text-field-sm text-field-muted">
                    {format(new Date(sig.signedAt), 'h:mm a')}
                  </Text>
                </View>
              ))}
            </View>
          </CollapsibleSection>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
