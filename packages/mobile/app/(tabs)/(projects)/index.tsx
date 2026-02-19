import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useProjects } from '@/hooks/queries/useProjects';
import { ProjectCard } from '@/components/project/ProjectCard';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/hooks/useTheme';

export default function ProjectsScreen() {
  const router = useRouter();
  const { data: projects, isLoading, error, refetch, isRefetching } = useProjects();
  const currentUser = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const canCreate = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PROJECT_MANAGER';

  if (isLoading) return <LoadingState message="Loading projects..." />;
  if (error) return <ErrorState message="Failed to load projects" onRetry={refetch} />;
  if (!projects?.length) {
    return <EmptyState title="No Projects" message="You haven't been added to any projects yet." icon="🏗️" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/(tabs)/(projects)/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      />
      {canCreate && (
        <Pressable
          onPress={() => router.push('/(tabs)/(projects)/new')}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '600', marginTop: -2 },
});
