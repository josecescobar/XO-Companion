import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useVoiceNotes } from '@/hooks/queries/useVoiceNotes';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/hooks/useTheme';

const statusVariant: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  UPLOADING: 'info',
  TRANSCRIBING: 'info',
  EXTRACTING: 'warning',
  REVIEW_READY: 'warning',
  PROCESSED: 'success',
  FAILED: 'error',
};

export default function VoiceNotesScreen() {
  const { projectId, logId } = useLocalSearchParams<{ projectId: string; logId: string }>();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useVoiceNotes(projectId, logId, true);
  const { colors } = useTheme();

  if (isLoading) return <LoadingState message="Loading voice notes..." />;

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Voice Notes' }} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push(
                `/(tabs)/(projects)/${projectId}/daily-logs/${logId}/voice/${item.id}`,
              )
            }
          >
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[styles.duration, { color: colors.text }]}>
                  {item.durationSeconds
                    ? `${Math.floor(item.durationSeconds / 60)}:${String(item.durationSeconds % 60).padStart(2, '0')}`
                    : '--:--'}
                </Text>
                <Badge label={item.status.replace(/_/g, ' ')} variant={statusVariant[item.status] ?? 'default'} />
              </View>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState title="No Voice Notes" message="Record a voice note to get started." icon="🎙️" />
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: { fontSize: 20, fontWeight: '700' },
  timestamp: { fontSize: 13, marginTop: 8 },
});
