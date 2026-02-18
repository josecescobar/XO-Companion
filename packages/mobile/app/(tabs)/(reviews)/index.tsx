import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useProjects } from '@/hooks/queries/useProjects';
import { useDailyLogs } from '@/hooks/queries/useDailyLogs';
import { usePendingReviews } from '@/hooks/queries/useReviews';
import { useSubmitReview } from '@/hooks/mutations/useSubmitReview';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { ReviewCard } from '@/components/review/ReviewCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import type { PendingReviewItem } from '@/api/endpoints/reviews';

function ReviewsList() {
  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useProjects();
  const { mutate: submit, isPending: submitting } = useSubmitReview();
  const [refreshing, setRefreshing] = useState(false);

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
    <>
      {/* Project tabs */}
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
              index === selectedProjectIdx ? styles.tabSelected : styles.tabDefault,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                index === selectedProjectIdx ? styles.tabTextSelected : styles.tabTextDefault,
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

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
    </>
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
  tabRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  tabSelected: { backgroundColor: '#2563eb' },
  tabDefault: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextSelected: { color: '#ffffff' },
  tabTextDefault: { color: '#64748b' },
});
