import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useIncidents } from '@/hooks/queries/useComplianceExtended';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
import { format } from 'date-fns';
import type { Incident } from '@/api/endpoints/compliance-extended';

const FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Recordable', value: true },
  { label: 'Non-Recordable', value: false },
] as const;

export default function IncidentsScreen() {
  const router = useRouter();
  const [recordableFilter, setRecordableFilter] = useState<boolean | undefined>(undefined);
  const { data, isLoading, error, refetch, isRefetching } = useIncidents(
    recordableFilter !== undefined ? { isRecordable: recordableFilter } : undefined,
  );
  const { colors } = useTheme();

  if (isLoading) return <LoadingState message="Loading incidents..." />;
  if (error) return <ErrorState message="Failed to load incidents" onRetry={refetch} />;

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Incidents' }} />

      {/* Filter chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.label}
              onPress={() => setRecordableFilter(f.value)}
              style={[
                styles.filterChip,
                recordableFilter === f.value
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: recordableFilter === f.value ? '#fff' : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IncidentRow incident={item} colors={colors} />}
        ListHeaderComponent={
          <Pressable
            onPress={() => router.push('/(tabs)/(compliance)/incidents/new')}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addButtonText}>+ Report Incident</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <EmptyState
            title="No Incidents"
            message={recordableFilter !== undefined ? 'No matching incidents found.' : 'No incidents have been reported.'}
            icon="shield-checkmark-outline"
          />
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />
    </ScreenWrapper>
  );
}

function IncidentRow({ incident, colors }: { incident: Incident; colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.employeeName, { color: colors.text }]} numberOfLines={1}>
          {incident.employeeName}
        </Text>
        <Badge
          label={incident.isRecordable ? 'OSHA Recordable' : 'Non-Recordable'}
          variant={incident.isRecordable ? 'error' : 'default'}
        />
      </View>
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        {format(new Date(incident.incidentDate), 'MMM d, yyyy')}
        {incident.location ? ` · ${incident.location}` : ''}
      </Text>
      <Text style={[styles.description, { color: colors.text }]} numberOfLines={2}>
        {incident.description}
      </Text>
      {(incident.daysAwayFromWork > 0 || incident.daysRestrictedDuty > 0) && (
        <View style={styles.daysRow}>
          {incident.daysAwayFromWork > 0 && (
            <Text style={[styles.daysBadge, { color: colors.error }]}>
              {incident.daysAwayFromWork}d away
            </Text>
          )}
          {incident.daysRestrictedDuty > 0 && (
            <Text style={[styles.daysBadge, { color: colors.warning }]}>
              {incident.daysRestrictedDuty}d restricted
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  filterRow: { gap: 8 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  filterText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  addButton: { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 8, minHeight: 48 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  card: { borderRadius: 14, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  employeeName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  date: { fontSize: 13, marginBottom: 6 },
  description: { fontSize: 14 },
  daysRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  daysBadge: { fontSize: 12, fontWeight: '700' },
});
