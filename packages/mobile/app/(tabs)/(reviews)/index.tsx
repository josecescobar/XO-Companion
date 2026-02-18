import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useProjects } from '@/hooks/queries/useProjects';
import { useDailyLogs } from '@/hooks/queries/useDailyLogs';
import { usePendingReviews, useReviewStats } from '@/hooks/queries/useReviews';
import { useSubmitReview } from '@/hooks/mutations/useSubmitReview';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { ReviewCard } from '@/components/review/ReviewCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useTheme } from '@/hooks/useTheme';
import type { PendingReviewItem } from '@/api/endpoints/reviews';

function ReviewsList() {
  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useProjects();
  const { mutate: submit, isPending: submitting } = useSubmitReview();
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0);
  const selectedProject = projects?.[selectedProjectIdx];

  const {
    data: logs,
    isLoading: loadingLogs,
  } = useDailyLogs(selectedProject?.id ?? '');

  const recentLog = logs?.[0];
  const {
    data: pendingItems,
    isLoading: loadingReviews,
    refetch: refetchReviews,
    isRefetching,
  } = usePendingReviews(
    selectedProject?.id ?? '',
    recentLog?.id ?? '',
  );

  const { data: reviewStats } = useReviewStats(selectedProject?.id ?? '');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchProjects();
    await refetchReviews();
    setRefreshing(false);
  }, [refetchProjects, refetchReviews]);

  if (loadingProjects) return <LoadingState message="Loading..." />;
  if (!projects?.length) {
    return <EmptyState title="No Projects" message="No projects to review." icon="✅" />;
  }

  const isLoading = loadingLogs || loadingReviews;

  return (
    <View style={styles.container}>
      {/* Project tabs */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {projects.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedProjectIdx(index)}
              style={[
                styles.tab,
                index === selectedProjectIdx
                  ? [styles.tabSelected, { backgroundColor: colors.primary }]
                  : [styles.tabDefault, { backgroundColor: colors.surface, borderColor: colors.border }],
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  index === selectedProjectIdx
                    ? styles.tabTextSelected
                    : [styles.tabTextDefault, { color: colors.textSecondary }],
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {reviewStats && reviewStats.totalReviewed > 0 && (
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{reviewStats.totalReviewed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reviewed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Math.round((reviewStats.approved / reviewStats.totalReviewed) * 100)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approval</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{reviewStats.approved}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.error }]}>{reviewStats.rejected}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{reviewStats.modified}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Modified</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <LoadingState message="Loading reviews..." />
      ) : !pendingItems?.length ? (
        <EmptyState
          title="All Clear"
          message="No pending reviews for this project."
          icon="✅"
        />
      ) : (
        <FlatList
          data={pendingItems}
          keyExtractor={(item) => `${item.entityType}-${item.entityId}`}
          renderItem={({ item }) => (
            <ReviewCard
              item={item}
              disabled={submitting}
              onApprove={() =>
                submit({
                  projectId: selectedProject!.id,
                  logId: recentLog!.id,
                  entityId: item.entityId,
                  entityType: item.entityType,
                  action: 'APPROVED',
                })
              }
              onReject={() =>
                submit({
                  projectId: selectedProject!.id,
                  logId: recentLog!.id,
                  entityId: item.entityId,
                  entityType: item.entityType,
                  action: 'REJECTED',
                })
              }
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          ListHeaderComponent={
            <SectionHeader
              title={`${pendingItems.length} Pending Review${pendingItems.length !== 1 ? 's' : ''}`}
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing || isRefetching} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

export default function ReviewsScreen() {
  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Reviews' }} />
      <ReviewsList />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: { flexShrink: 0, paddingHorizontal: 16, paddingVertical: 12 },
  tabRow: { gap: 8 },
  tab: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  tabSelected: {},
  tabDefault: { borderWidth: 1 },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextSelected: { color: '#ffffff' },
  tabTextDefault: {},
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
