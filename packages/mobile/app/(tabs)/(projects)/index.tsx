import { FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useProjects } from '@/hooks/queries/useProjects';
import { ProjectCard } from '@/components/project/ProjectCard';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';

export default function ProjectsScreen() {
  const router = useRouter();
  const { data: projects, isLoading, error, refetch, isRefetching } = useProjects();

  if (isLoading) return <LoadingState message="Loading projects..." />;
  if (error) return <ErrorState message="Failed to load projects" onRetry={refetch} />;
  if (!projects?.length) {
    return <EmptyState title="No Projects" message="You haven't been added to any projects yet." icon="🏗️" />;
  }

  return (
    <ScreenWrapper>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/(tabs)/(projects)/${item.id}`)}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      />
    </ScreenWrapper>
  );
}
