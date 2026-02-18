import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
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

// Review items augmented with project/log context
interface ReviewItemWithContext extends PendingReviewItem {
  projectId: string;
  projectName: string;
}

function ReviewsList() {
  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useProjects();
  const { mutate: submit, isPending: submitting } = useSubmitReview();
  const [refreshing, setRefreshing] = useState(false);

  // For now, show a simplified version that lets users select a project
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0);
  const selectedProject = projects?.[selectedProjectIdx];

  const {
    data: logs,
    isLoading: loadingLogs,
  } = useDailyLogs(selectedProject?.id ?? '');

  // Get the most recent log with pending reviews
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
      <FlatList
        horizontal
        data={projects}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        renderItem={({ item, index }) => (
          <Text
            onPress={() => setSelectedProjectIdx(index)}
            className={`rounded-full px-4 py-2 text-field-sm font-medium ${
              index === selectedProjectIdx
                ? 'bg-brand-500 text-white'
                : 'bg-field-card text-field-muted'
            }`}
          >
            {item.name}
          </Text>
        )}
      />

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
