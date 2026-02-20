import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useProjectsOffline } from '@/hooks/queries/useProjectsOffline';
import { ProjectCard } from '@/components/project/ProjectCard';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/hooks/useTheme';

export default function ProjectsScreen() {
  const router = useRouter();
  const { data: projects, isLoading, error, refetch } = useProjectsOffline();
  const currentUser = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const canCreate = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PROJECT_MANAGER';

  if (isLoading) return <LoadingState message="Loading projects..." />;
  if (error) return <ErrorState message="Failed to load projects" onRetry={refetch} />;
  if (!projects?.length) {
    return <EmptyState title="No Projects" message="You haven't been added to any projects yet." icon="construct-outline" />;
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
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '600', marginTop: -2 },
});
