import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useProjectCommunications } from '@/hooks/queries/useCommunications';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import type { CommunicationDetail, CommunicationStatus } from '@/api/endpoints/communications';

type FilterKey = 'ALL' | 'DRAFT' | 'APPROVED' | 'SENT' | 'CANCELLED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'SENT', label: 'Sent' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_ICONS: Record<string, string> = {
  EMAIL: '📧', TEXT: '💬', CALL: '📞', RFI: '❓', CHANGE_ORDER: '🔄',
};

const STATUS_CONFIG: Record<CommunicationStatus, { label: string; color: string; bg: string }> = {
  DRAFTING: { label: '⏳ Drafting', color: '#2563eb', bg: '#dbeafe' },
  DRAFT: { label: '📝 Draft', color: '#2563eb', bg: '#dbeafe' },
  APPROVED: { label: '✅ Approved', color: '#16a34a', bg: '#dcfce7' },
  SENT: { label: '📤 Sent', color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { label: '❌ Cancelled', color: '#dc2626', bg: '#fee2e2' },
};

export default function CommunicationsListScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const filters = activeFilter === 'ALL'
    ? undefined
    : activeFilter === 'DRAFT'
    ? { status: 'DRAFT' }
    : { status: activeFilter };

  const { data: comms, isLoading, refetch, isRefetching } = useProjectCommunications(projectId, filters);

  // For the DRAFT filter, also include DRAFTING items
  const filteredComms = activeFilter === 'DRAFT'
    ? (comms ?? []).filter((c) => c.status === 'DRAFT' || c.status === 'DRAFTING')
    : comms ?? [];

  if (isLoading) return <LoadingState message="Loading communications..." />;

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Communications' }} />

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[
              styles.filterChip,
              activeFilter === f.key
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
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
        data={filteredComms}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const statusCfg = STATUS_CONFIG[item.status];
          return (
            <Pressable
              onPress={() => router.push(`/(tabs)/(projects)/${projectId}/communications/${item.id}` as any)}
              style={({ pressed }) => [
                styles.card, { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.cardRow}>
                <Text style={styles.typeIcon}>{TYPE_ICONS[item.type] ?? '✉️'}</Text>
                <View style={styles.cardContent}>
                  <Text style={[styles.subject, { color: colors.text }]} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <Text style={[styles.recipient, { color: colors.textSecondary }]} numberOfLines={1}>
                    To: {item.recipient}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      {item.status === 'DRAFTING' && <ActivityIndicator size={10} color={statusCfg.color} style={{ marginRight: 4 }} />}
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                    {item.urgency === 'HIGH' && <View style={styles.urgencyDot} />}
                    {item.aiGenerated && <Text style={styles.aiIcon}>🤖</Text>}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No communications yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Record a voice note and XO will auto-draft emails, RFIs, and more.
            </Text>
          </View>
        }
      />

      <Pressable
        onPress={() => router.push(`/(tabs)/(projects)/${projectId}/communications/new` as any)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.fabText}>✏️ New Communication</Text>
      </Pressable>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  filterText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 10, borderWidth: 1, marginBottom: 8, padding: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  typeIcon: { fontSize: 24, marginTop: 2 },
  cardContent: { flex: 1 },
  subject: { fontSize: 15, fontWeight: '600' },
  recipient: { fontSize: 13, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  urgencyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626' },
  aiIcon: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 20, right: 20, borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 14, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
