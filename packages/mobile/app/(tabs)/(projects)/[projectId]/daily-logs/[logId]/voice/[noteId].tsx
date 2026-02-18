import { ScrollView, View, Text, RefreshControl, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useVoiceNote } from '@/hooks/queries/useVoiceNotes';
import { useApplyExtractedData } from '@/hooks/mutations/useApplyExtractedData';
import { useReprocessVoiceNote } from '@/hooks/mutations/useReprocessVoiceNote';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CollapsibleSection } from '@/components/daily-log/CollapsibleSection';
import { ExtractedDataSections } from '@/components/voice-note/ExtractedDataSections';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

const statusVariant: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  UPLOADING: 'info',
  TRANSCRIBING: 'info',
  EXTRACTING: 'warning',
  REVIEW_READY: 'warning',
  PROCESSED: 'success',
  FAILED: 'error',
};

const statusLabel: Record<string, string> = {
  UPLOADING: 'Uploading',
  TRANSCRIBING: 'Transcribing...',
  EXTRACTING: 'Extracting data...',
  REVIEW_READY: 'Ready for Review',
  PROCESSED: 'Processed',
  FAILED: 'Failed',
};

export default function VoiceNoteDetailScreen() {
  const { projectId, logId, noteId } = useLocalSearchParams<{
    projectId: string;
    logId: string;
    noteId: string;
  }>();

  const { data, isLoading, error, refetch, isRefetching } = useVoiceNote(
    projectId,
    logId,
    noteId,
    true,
  );
  const { mutate: apply, isPending: isApplying } = useApplyExtractedData();
  const { mutate: reprocess, isPending: isReprocessing } = useReprocessVoiceNote();
  const { colors } = useTheme();

  if (isLoading) return <LoadingState message="Loading voice note..." />;
  if (error || !data) return <ErrorState message="Failed to load voice note" onRetry={refetch} />;

  const status = data.status;
  const isProcessing = status === 'TRANSCRIBING' || status === 'EXTRACTING' || status === 'UPLOADING';

  const handleApply = () => {
    Alert.alert('Apply to Log?', 'This will add the extracted data to the daily log.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Apply',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          apply({ projectId, logId, noteId });
        },
      },
    ]);
  };

  const handleReprocess = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    reprocess({ projectId, logId, noteId });
  };

  const formattedDuration = data.durationSeconds
    ? `${Math.floor(data.durationSeconds / 60)}:${String(data.durationSeconds % 60).padStart(2, '0')}`
    : '--:--';

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Voice Note' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Audio Info Header */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.duration, { color: colors.text }]}>{formattedDuration}</Text>
            <Badge
              label={statusLabel[status] ?? status}
              variant={statusVariant[status] ?? 'default'}
            />
          </View>
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
            {format(new Date(data.createdAt), 'MMM d, yyyy h:mm a')}
          </Text>
        </View>

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={[styles.processingCard, { backgroundColor: colors.primaryLight }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.primary }]}>
              {status === 'UPLOADING'
                ? 'Uploading audio...'
                : status === 'TRANSCRIBING'
                  ? 'Transcribing audio...'
                  : 'Extracting structured data...'}
            </Text>
          </View>
        )}

        {/* Failed State */}
        {status === 'FAILED' && (
          <View style={[styles.errorCard, { backgroundColor: colors.errorLight }]}>
            <Text style={[styles.errorTitle, { color: colors.error }]}>Processing Failed</Text>
            {data.processingError && (
              <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{data.processingError}</Text>
            )}
            <Button
              title="Reprocess"
              variant="danger"
              onPress={handleReprocess}
              loading={isReprocessing}
            />
          </View>
        )}

        {/* Transcript */}
        {data.transcript && (
          <CollapsibleSection title="Transcript" defaultOpen>
            <Text style={[styles.transcriptText, { color: colors.text }]}>{data.transcript}</Text>
          </CollapsibleSection>
        )}

        {/* Extracted Data */}
        {data.extractedData && (status === 'REVIEW_READY' || status === 'PROCESSED') && (
          <ExtractedDataSections extractedData={data.extractedData as Record<string, unknown>} />
        )}

        {/* Action Buttons */}
        {status === 'REVIEW_READY' && (
          <Button
            title="Apply to Log"
            variant="primary"
            size="lg"
            onPress={handleApply}
            loading={isApplying}
          />
        )}

        {status === 'PROCESSED' && (
          <View style={styles.appliedBanner}>
            <Badge label="Already Applied" variant="success" />
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: { fontSize: 24, fontWeight: '700' },
  timestamp: { fontSize: 13, marginTop: 8 },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  processingText: { fontSize: 14, fontWeight: '500' },
  errorCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  errorTitle: { fontSize: 16, fontWeight: '600' },
  errorMessage: { fontSize: 14 },
  transcriptText: { fontSize: 15, lineHeight: 22 },
  appliedBanner: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
