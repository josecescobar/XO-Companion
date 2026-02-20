import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRecorder } from '@/hooks/useRecorder';
import { useProjects } from '@/hooks/queries/useProjects';
import { useDailyLogs } from '@/hooks/queries/useDailyLogs';
import { useVoiceNote } from '@/hooks/queries/useVoiceNotes';
import { useUploadVoice } from '@/hooks/mutations/useUploadVoice';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { MediaAttachmentBar } from '@/components/media/MediaAttachmentBar';
import { MediaPreviewModal } from '@/components/media/MediaPreviewModal';
import { uploadMedia } from '@/api/endpoints/media';
import { RecordButton } from '@/components/recording/RecordButton';
import { RecordingTimer } from '@/components/recording/RecordingTimer';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';
import type { MediaAsset } from '@/hooks/useMediaCapture';

type ProcessingPhase = 'idle' | 'uploading' | 'tracking';

const STATUS_STAGES = [
  { key: 'UPLOADING', icon: '⏳', label: 'Uploading...' },
  { key: 'TRANSCRIBING', icon: '🎙️', label: 'Transcribing...' },
  { key: 'EXTRACTING', icon: '🤖', label: 'Extracting data...' },
  { key: 'REVIEW_READY', icon: '✅', label: 'Ready for review' },
] as const;

function getStageIndex(status: string): number {
  if (status === 'UPLOADED' || status === 'QUEUED') return 0;
  if (status === 'TRANSCRIBING') return 1;
  if (status === 'EXTRACTING') return 2;
  if (status === 'REVIEW_READY' || status === 'APPLIED') return 3;
  return 0;
}

export default function RecordScreen() {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const { state, duration, uri, start, stop, reset } = useRecorder();
  const { mutateAsync: uploadVoiceAsync, isPending: uploading } = useUploadVoice();
  const { colors } = useTheme();

  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>('idle');
  const [uploadedVoiceId, setUploadedVoiceId] = useState<string | null>(null);

  // Photo attachments
  const [mediaAttachments, setMediaAttachments] = useState<MediaAsset[]>([]);
  const [previewIndex, setPreviewIndex] = useState(-1);

  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: logs, isLoading: loadingLogs } = useDailyLogs(
    selectedProjectId ?? '',
  );

  // Poll voice note status after upload
  const { data: voiceNote } = useVoiceNote(
    selectedProjectId ?? '',
    selectedLogId ?? '',
    uploadedVoiceId ?? '',
    processingPhase === 'tracking',
  );

  const voiceStatus = voiceNote?.status ?? '';
  const stageIndex = getStageIndex(voiceStatus);
  const isProcessingDone = voiceStatus === 'REVIEW_READY' || voiceStatus === 'APPLIED';
  const isProcessingError = voiceStatus === 'ERROR';

  const handleRecordToggle = async () => {
    try {
      if (state === 'recording') {
        await stop();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await start();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Recording failed');
    }
  };

  const handleUpload = async () => {
    if (!uri || !selectedProjectId || !selectedLogId) return;

    setProcessingPhase('uploading');
    try {
      const data = await uploadVoiceAsync({
        projectId: selectedProjectId,
        logId: selectedLogId,
        fileUri: uri,
      });
      setUploadedVoiceId(data.id);
      setProcessingPhase('tracking');

      // Upload attached photos with voice note ID
      for (const photo of mediaAttachments) {
        try {
          await uploadMedia(selectedProjectId, {
            uri: photo.uri,
            type: photo.type === 'photo' ? 'image/jpeg' : 'video/mp4',
            name: photo.fileName,
          }, {
            type: photo.type === 'photo' ? 'PHOTO' : 'VIDEO',
            dailyLogId: selectedLogId,
            voiceNoteId: data.id,
          });
        } catch { /* continue uploading remaining photos */ }
      }

      reset();
    } catch (err) {
      setProcessingPhase('idle');
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleNewRecording = () => {
    setProcessingPhase('idle');
    setUploadedVoiceId(null);
    setMediaAttachments([]);
    reset();
  };

  const handleReview = () => {
    if (!selectedProjectId || !selectedLogId) return;
    router.push(`/(tabs)/(projects)/${selectedProjectId}/daily-logs/${selectedLogId}/review`);
  };

  if (loadingProjects) return <LoadingState message="Loading projects..." />;

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Record Voice Note' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Project Selector */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Select Project</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {projects?.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setSelectedProjectId(p.id);
                setSelectedLogId(null);
                handleNewRecording();
              }}
              style={[
                styles.chip,
                selectedProjectId === p.id
                  ? [styles.chipSelected, { backgroundColor: colors.primary }]
                  : [styles.chipDefault, { backgroundColor: colors.surface, borderColor: colors.border }],
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedProjectId === p.id
                    ? styles.chipTextSelected
                    : [styles.chipTextDefault, { color: colors.text }],
                ]}
              >
                {p.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Daily Log Selector */}
        {selectedProjectId && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Select Daily Log</Text>
            {loadingLogs ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading logs...</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {logs?.map((log) => (
                  <Pressable
                    key={log.id}
                    onPress={() => {
                      setSelectedLogId(log.id);
                      handleNewRecording();
                    }}
                    style={[
                      styles.chip,
                      selectedLogId === log.id
                        ? [styles.chipSelected, { backgroundColor: colors.primary }]
                        : [styles.chipDefault, { backgroundColor: colors.surface, borderColor: colors.border }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedLogId === log.id
                          ? styles.chipTextSelected
                          : [styles.chipTextDefault, { color: colors.text }],
                      ]}
                    >
                      {format(new Date(log.logDate), 'MMM d')}
                    </Text>
                  </Pressable>
                ))}
                {!logs?.length && (
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>No daily logs in this project</Text>
                )}
              </ScrollView>
            )}
          </>
        )}

        {/* Recording Area */}
        <View style={[styles.recordingCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {!selectedProjectId || !selectedLogId ? (
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              Select a project and daily log to start recording
            </Text>
          ) : processingPhase === 'tracking' ? (
            /* Processing Status Tracker */
            <View style={styles.statusTracker}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>Processing Voice Note</Text>

              {STATUS_STAGES.map((stage, i) => {
                const isComplete = stageIndex > i;
                const isCurrent = stageIndex === i && !isProcessingDone;
                const isPending = stageIndex < i;

                return (
                  <View key={stage.key} style={styles.statusRow}>
                    <View style={[
                      styles.statusDot,
                      isComplete && { backgroundColor: colors.success },
                      isCurrent && { backgroundColor: colors.primary },
                      isPending && { backgroundColor: colors.border },
                    ]}>
                      {isCurrent && !isProcessingDone && (
                        <ActivityIndicator size="small" color="#fff" />
                      )}
                      {isComplete && <Text style={styles.statusCheckmark}>✓</Text>}
                      {isProcessingDone && i === 3 && <Text style={styles.statusCheckmark}>✓</Text>}
                    </View>
                    <Text style={[
                      styles.statusLabel,
                      { color: isComplete || isCurrent || (isProcessingDone && i === 3) ? colors.text : colors.textTertiary },
                      (isComplete || (isProcessingDone && i === 3)) && { textDecorationLine: 'none' as const },
                    ]}>
                      {stage.icon} {isProcessingDone && i === 3 ? 'Ready for review' : stage.label}
                    </Text>
                  </View>
                );
              })}

              {/* Show transcript when available */}
              {voiceNote?.transcript && (
                <View style={[styles.transcriptBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.transcriptLabel, { color: colors.textSecondary }]}>Transcript</Text>
                  <Text style={[styles.transcriptText, { color: colors.text }]} numberOfLines={6}>
                    {voiceNote.transcript}
                  </Text>
                </View>
              )}

              {isProcessingError && (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    Processing failed: {voiceNote?.processingError ?? 'Unknown error'}
                  </Text>
                </View>
              )}

              <View style={styles.statusActions}>
                {isProcessingDone && (
                  <Button
                    title="Review Extracted Data"
                    onPress={handleReview}
                    size="lg"
                  />
                )}
                <View style={{ height: 8 }} />
                <Button
                  title="Record Another"
                  variant={isProcessingDone ? 'secondary' : 'ghost'}
                  onPress={handleNewRecording}
                />
              </View>
            </View>
          ) : (
            <>
              <RecordingTimer seconds={duration} />
              <View style={styles.recordBtnWrapper}>
                <RecordButton
                  state={state}
                  onPress={handleRecordToggle}
                  disabled={uploading}
                />
              </View>

              {state === 'stopped' && uri && (
                <View style={styles.uploadArea}>
                  <Button
                    title={uploading ? 'Uploading...' : 'Upload Voice Note'}
                    onPress={handleUpload}
                    loading={uploading}
                    size="lg"
                  />
                  <View style={{ height: 12 }} />
                  <Button
                    title="Discard & Record Again"
                    variant="ghost"
                    onPress={reset}
                    disabled={uploading}
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/* Photo Attachments — visible when recording area is active */}
        {selectedProjectId && selectedLogId && processingPhase === 'idle' && (
          <View style={styles.mediaSection}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Attach Photos</Text>
            <MediaAttachmentBar
              attachments={mediaAttachments}
              onAdd={(asset) => setMediaAttachments((prev) => [...prev, asset])}
              onRemove={(i) => setMediaAttachments((prev) => prev.filter((_, idx) => idx !== i))}
              onPreview={(i) => setPreviewIndex(i)}
            />
          </View>
        )}

        {/* AI Inspection Suggestion — show after photos attached */}
        {selectedProjectId && mediaAttachments.length > 0 && processingPhase === 'idle' && (
          <Pressable
            onPress={() => router.push(`/(tabs)/(projects)/${selectedProjectId}/inspections/new`)}
            style={[styles.inspectSuggestion, { backgroundColor: colors.surface, borderColor: '#7C3AED' }]}
          >
            <Text style={styles.inspectSuggestionIcon}>{'\u{1F50D}'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inspectSuggestionTitle, { color: '#7C3AED' }]}>Run AI Inspection?</Text>
              <Text style={[styles.inspectSuggestionText, { color: colors.textSecondary }]}>
                Analyze attached photos against specs & drawings
              </Text>
            </View>
            <Text style={{ color: '#7C3AED', fontSize: 20 }}>{'\u{203A}'}</Text>
          </Pressable>
        )}
      </ScrollView>

      <MediaPreviewModal
        visible={previewIndex >= 0}
        items={mediaAttachments}
        initialIndex={Math.max(0, previewIndex)}
        onClose={() => setPreviewIndex(-1)}
        onDelete={(i) => {
          setMediaAttachments((prev) => prev.filter((_, idx) => idx !== i));
          if (mediaAttachments.length <= 1) setPreviewIndex(-1);
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  chipRow: { gap: 8, marginBottom: 16 },
  chip: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chipSelected: {},
  chipDefault: { borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: '#ffffff' },
  chipTextDefault: {},
  loadingText: { fontSize: 14, marginBottom: 16 },
  recordingCard: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  placeholderText: { fontSize: 16 },
  recordBtnWrapper: { marginTop: 32 },
  uploadArea: { marginTop: 32, width: '100%', paddingHorizontal: 16 },
  mediaSection: { marginTop: 16 },
  // Status tracker
  statusTracker: { width: '100%', paddingHorizontal: 8 },
  statusTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCheckmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusLabel: { fontSize: 15, fontWeight: '500' },
  transcriptBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  transcriptLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  transcriptText: { fontSize: 14, lineHeight: 20 },
  errorBox: { borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 16 },
  errorText: { fontSize: 14 },
  statusActions: { marginTop: 8, width: '100%' },
  // Inspection suggestion
  inspectSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
    marginTop: 16,
  },
  inspectSuggestionIcon: { fontSize: 24 },
  inspectSuggestionTitle: { fontSize: 15, fontWeight: '700' },
  inspectSuggestionText: { fontSize: 13, marginTop: 2 },
});
