import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjectTasksOffline } from '@/hooks/queries/useTasksOffline';
import { useUpdateTask, useCreateTask } from '@/hooks/mutations/useTaskMutations';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
import { format } from 'date-fns';
import type { Task } from '@/api/endpoints/tasks';

type FilterKey = 'ALL' | 'PENDING' | 'URGENT' | 'OVERDUE' | 'COMPLETED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'URGENT', label: 'Urgent' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'COMPLETED', label: 'Completed' },
];

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#eab308',
  LOW: '#9ca3af',
};

export default function TasksScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [newDescription, setNewDescription] = useState('');

  const filters = activeFilter === 'COMPLETED'
    ? { status: 'COMPLETED' }
    : activeFilter === 'PENDING'
    ? { status: 'PENDING' }
    : activeFilter === 'URGENT'
    ? { priority: 'URGENT' }
    : undefined;

  const { data: tasks, isLoading, refetch } = useProjectTasksOffline(projectId, filters);
  const updateTask = useUpdateTask(projectId);
  const createTask = useCreateTask(projectId);

  const filteredTasks = activeFilter === 'OVERDUE'
    ? (tasks ?? []).filter((t: Task) => {
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date();
      })
    : tasks ?? [];

  const handleComplete = (task: Task) => {
    updateTask.mutate({ taskId: task.id, body: { status: 'COMPLETED' } });
  };

  const handleCreate = () => {
    if (!newDescription.trim()) return;
    createTask.mutate(
      { description: newDescription.trim() },
      {
        onSuccess: () => {
          setNewDescription('');
          setShowCreate(false);
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  if (isLoading) return <LoadingState message="Loading tasks..." />;

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Tasks' }} />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[
              styles.filterChip,
              activeFilter === f.key
                ? { backgroundColor: colors.primary }
                : [shadows.sm, { backgroundColor: colors.surface }],
            ]}
          >
            <Text style={[
              styles.filterText,
              { color: activeFilter === f.key ? '#fff' : colors.textSecondary },
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.taskCard, shadows.md, { backgroundColor: colors.surface }]}>
            <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLORS[item.priority] ?? colors.border }]} />
            <Pressable
              onPress={() => handleComplete(item)}
              style={[
                styles.checkbox,
                { borderColor: item.status === 'COMPLETED' ? colors.success : colors.border },
                item.status === 'COMPLETED' && { backgroundColor: colors.successLight },
              ]}
            >
              {item.status === 'COMPLETED' && <Ionicons name="checkmark" size={14} color={colors.success} />}
            </Pressable>
            <View style={styles.taskContent}>
              <Text
                style={[
                  styles.taskDescription,
                  { color: colors.text },
                  item.status === 'COMPLETED' && { textDecorationLine: 'line-through', color: colors.textTertiary },
                ]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
              <View style={styles.taskMeta}>
                <View style={[styles.categoryBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.categoryText, { color: colors.primary }]}>
                    {item.category.replace('_', ' ')}
                  </Text>
                </View>
                {item.dueDate && (
                  <Text style={[styles.metaText, {
                    color: new Date(item.dueDate) < new Date() && item.status !== 'COMPLETED'
                      ? colors.error
                      : colors.textTertiary,
                  }]}>
                    {format(new Date(item.dueDate), 'MMM d')}
                  </Text>
                )}
                {item.assignee && (
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>{item.assignee}</Text>
                )}
                {item.aiGenerated && <Ionicons name="sparkles" size={14} color={colors.primary} />}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No tasks found</Text>
        }
      />

      {/* Create task inline */}
      {showCreate ? (
        <View style={[styles.createBar, shadows.md, { backgroundColor: colors.surface }]}>
          <Input
            placeholder="What needs to be done?"
            value={newDescription}
            onChangeText={setNewDescription}
            style={{ flex: 1 }}
            autoFocus
          />
          <View style={styles.createActions}>
            <Button title="Add" onPress={handleCreate} loading={createTask.isPending} size="sm" />
            <Button title="Cancel" variant="ghost" onPress={() => setShowCreate(false)} size="sm" />
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setShowCreate(true)}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.fabText}>+ New Task</Text>
        </Pressable>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center' as const },
  filterText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 80 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    minHeight: 48,
  },
  priorityBar: { width: 4, alignSelf: 'stretch' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  taskContent: { flex: 1, paddingVertical: 12, paddingRight: 12 },
  taskDescription: { fontSize: 15, fontWeight: '600' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  categoryBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  categoryText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metaText: { fontSize: 12 },
  empty: { fontSize: 16, textAlign: 'center', paddingVertical: 32 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  createBar: {
    padding: 16,
    gap: 8,
  },
  createActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
});
