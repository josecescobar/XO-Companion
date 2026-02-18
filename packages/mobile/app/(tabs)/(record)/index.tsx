import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
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
import { Card } from '@/components/ui/Card';
import { format } from 'date-fns';

export default function RecordScreen() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const { state, duration, uri, start, stop, reset } = useRecorder();
  const { mutate: upload, isPending: uploading } = useUploadVoice();

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
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Project Selector */}
        <Text className="mb-2 text-field-sm font-medium text-field-muted">
          Select Project
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 16 }}
        >
          {projects?.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setSelectedProjectId(p.id);
                setSelectedLogId(null);
              }}
              className={`rounded-lg px-4 py-3 ${
                selectedProjectId === p.id
                  ? 'bg-brand-500'
                  : 'bg-field-card border border-field-border'
              }`}
            >
              <Text
                className={`text-field-sm font-medium ${
                  selectedProjectId === p.id ? 'text-white' : 'text-field-text'
                }`}
              >
                {p.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Daily Log Selector */}
        {selectedProjectId && (
          <>
            <Text className="mb-2 text-field-sm font-medium text-field-muted">
              Select Daily Log
            </Text>
            {loadingLogs ? (
              <Text className="mb-4 text-field-sm text-field-muted">
                Loading logs...
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 16 }}
              >
                {logs?.map((log) => (
                  <Pressable
                    key={log.id}
                    onPress={() => setSelectedLogId(log.id)}
                    className={`rounded-lg px-4 py-3 ${
                      selectedLogId === log.id
                        ? 'bg-brand-500'
                        : 'bg-field-card border border-field-border'
                    }`}
                  >
                    <Text
                      className={`text-field-sm font-medium ${
                        selectedLogId === log.id ? 'text-white' : 'text-field-text'
                      }`}
                    >
                      {format(new Date(log.logDate), 'MMM d')}
                    </Text>
                  </Pressable>
                ))}
                {!logs?.length && (
                  <Text className="text-field-sm text-field-muted">
                    No daily logs in this project
                  </Text>
                )}
              </ScrollView>
            )}
          </>
        )}

        {/* Recording Area */}
        <Card className="mt-4 items-center py-12">
          {!selectedProjectId || !selectedLogId ? (
            <Text className="text-field-base text-field-muted">
              Select a project and daily log to start recording
            </Text>
          ) : (
            <>
              <RecordingTimer seconds={duration} />
              <View className="mt-8">
                <RecordButton
                  state={state}
                  onPress={handleRecordToggle}
                  disabled={uploading}
                />
              </View>

              {state === 'stopped' && uri && (
                <View className="mt-8 w-full gap-3 px-4">
                  <Button
                    title={uploading ? 'Uploading...' : 'Upload Voice Note'}
                    onPress={handleUpload}
                    loading={uploading}
                    size="lg"
                  />
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
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}
