import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRecorder } from '@/hooks/useRecorder';
import { useProjects } from '@/hooks/queries/useProjects';
import { useDailyLogs } from '@/hooks/queries/useDailyLogs';
import { useUploadVoice } from '@/hooks/mutations/useUploadVoice';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { RecordButton } from '@/components/recording/RecordButton';
import { RecordingTimer } from '@/components/recording/RecordingTimer';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';

export default function RecordScreen() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const { state, duration, uri, start, stop, reset } = useRecorder();
  const { mutate: upload, isPending: uploading } = useUploadVoice();
  const { colors } = useTheme();

  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: logs, isLoading: loadingLogs } = useDailyLogs(
    selectedProjectId ?? '',
  );

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

  const handleUpload = () => {
    if (!uri || !selectedProjectId || !selectedLogId) return;

    upload(
      { projectId: selectedProjectId, logId: selectedLogId, fileUri: uri },
      {
        onSuccess: () => {
          Alert.alert('Uploaded', 'Voice note is being processed.');
          reset();
        },
        onError: (err) => {
          Alert.alert('Upload Failed', err.message);
        },
      },
    );
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
                    onPress={() => setSelectedLogId(log.id)}
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
      </ScrollView>
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
});
