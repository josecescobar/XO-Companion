import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useProjectInspections } from '@/hooks/queries/useInspections';
import { useTheme } from '@/hooks/useTheme';
import type { InspectionDetail, InspectionStatus } from '@/api/endpoints/inspections';

const FILTER_OPTIONS: { key: InspectionStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PASS', label: 'Pass' },
  { key: 'FAIL', label: 'Fail' },
  { key: 'NEEDS_ATTENTION', label: 'Attention' },
  { key: 'PENDING', label: 'Pending' },
];

const STATUS_BAR_COLOR: Record<string, string> = {
  PASS: '#16A34A',
  FAIL: '#DC2626',
  NEEDS_ATTENTION: '#D97706',
  PENDING: '#9CA3AF',
  PROCESSING: '#2563EB',
  INCONCLUSIVE: '#6B7280',
};

const TYPE_LABELS: Record<string, string> = {
  DRAWING_COMPARISON: 'Drawing',
  SPEC_COMPLIANCE: 'Spec',
  SAFETY_CHECK: 'Safety',
  QUALITY_CHECK: 'Quality',
  PROGRESS_PHOTO: 'Progress',
  GENERAL: 'General',
};

export default function InspectionsListScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'ALL'>('ALL');

  const filters = statusFilter !== 'ALL' ? { status: statusFilter } : undefined;
  const { data: inspections, isLoading, refetch, isRefetching } = useProjectInspections(projectId, filters);

  const renderItem = ({ item }: { item: InspectionDetail }) => {
    const barColor = STATUS_BAR_COLOR[item.status] || '#9CA3AF';
    return (
      <Pressable
        onPress={() => router.push(`/(tabs)/(projects)/${projectId}/inspections/${item.id}`)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={[styles.statusBar, { backgroundColor: barColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.aiOverallScore != null && (
              <View style={[styles.scoreBadge, { backgroundColor: barColor }]}>
                <Text style={styles.scoreText}>{item.aiOverallScore}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardMeta}>
            <View style={[styles.typeBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                {TYPE_LABELS[item.inspectionType] || item.inspectionType}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Inspections' }} />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setStatusFilter(opt.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: statusFilter === opt.key ? colors.primary : colors.surface,
                borderColor: statusFilter === opt.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: statusFilter === opt.key ? '#fff' : colors.text },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={inspections || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u{1F50D}'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No inspections yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Take a photo of work in place and let AI compare it against your specs.
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push(`/(tabs)/(projects)/${projectId}/inspections/new`)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.fabText}>{'\u{1F4F7}'} New Inspection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  filterText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  // Card
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  statusBar: { width: 5 },
  cardContent: { flex: 1, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  scoreBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, minWidth: 32, alignItems: 'center' },
  scoreText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 12 },
  // Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    left: 16,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
