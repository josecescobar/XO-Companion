import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useProject } from '@/hooks/queries/useProjects';
import { useDailyLogs } from '@/hooks/queries/useDailyLogs';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusChip } from '@/components/ui/StatusChip';
import { SectionHeader } from '@/components/common/SectionHeader';
import { format } from 'date-fns';

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { data: project, isLoading: loadingProject, error: projectError, refetch: refetchProject } = useProject(projectId);
  const { data: logs, isLoading: loadingLogs, refetch: refetchLogs, isRefetching } = useDailyLogs(projectId);

  if (loadingProject) return <LoadingState message="Loading project..." />;
  if (projectError || !project) return <ErrorState message="Failed to load project" onRetry={refetchProject} />;

  const recentLogs = logs?.slice(0, 10) ?? [];

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: project.name }} />
      <FlatList
        data={recentLogs}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-4">
            {/* Project Header */}
            <Card className="mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-field-xl font-bold text-field-text">
                  {project.name}
                </Text>
                <Badge
                  label={project.isActive ? 'Active' : 'Inactive'}
                  variant={project.isActive ? 'success' : 'default'}
                />
              </View>
              <Text className="mt-1 text-field-sm text-field-muted">
                {project.code}
              </Text>
              {(project.city || project.state) && (
                <Text className="mt-2 text-field-base text-field-muted">
                  {[project.address, project.city, project.state]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              )}
              <View className="mt-3 flex-row gap-4">
                <Text className="text-field-sm text-field-muted">
                  {project.members.length} members
                </Text>
                <Text className="text-field-sm text-field-muted">
                  {project._count.dailyLogs} daily logs
                </Text>
              </View>
            </Card>

            <SectionHeader
              title="Recent Daily Logs"
              action={{
                label: 'View All',
                onPress: () =>
                  router.push(`/(tabs)/(projects)/${projectId}/daily-logs`),
              }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push(
                `/(tabs)/(projects)/${projectId}/daily-logs/${item.id}`,
              )
            }
          >
            <Card className="mb-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-field-base font-semibold text-field-text">
                  {format(new Date(item.logDate), 'MMM d, yyyy')}
                </Text>
                <StatusChip status={item.status} />
              </View>
              <View className="mt-2 flex-row gap-3">
                {item._count.workforce > 0 && (
                  <Text className="text-field-sm text-field-muted">
                    {item._count.workforce} crews
                  </Text>
                )}
                {item._count.voiceNotes > 0 && (
                  <Text className="text-field-sm text-field-muted">
                    {item._count.voiceNotes} voice notes
                  </Text>
                )}
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          loadingLogs ? (
            <LoadingState message="Loading logs..." />
          ) : (
            <View className="items-center py-8">
              <Text className="text-field-base text-field-muted">
                No daily logs yet
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchProject();
              refetchLogs();
            }}
          />
        }
      />
    </ScreenWrapper>
  );
}
