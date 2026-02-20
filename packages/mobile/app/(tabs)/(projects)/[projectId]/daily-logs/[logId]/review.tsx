import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { usePendingReviews } from '@/hooks/queries/useReviews';
import { useSubmitReview } from '@/hooks/mutations/useSubmitReview';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ReviewCard } from '@/components/review/ReviewCard';

export default function LogReviewScreen() {
  const { projectId, logId } = useLocalSearchParams<{ projectId: string; logId: string }>();
  const { data, isLoading, refetch, isRefetching } = usePendingReviews(projectId, logId);
  const { mutate: submit, isPending } = useSubmitReview();

  if (isLoading) return <LoadingState message="Loading reviews..." />;

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Review AI Data' }} />
      <FlatList
        data={data}
        keyExtractor={(item) => `${item.entityType}-${item.entityId}`}
        renderItem={({ item }) => (
          <ReviewCard
            item={item}
            disabled={isPending}
            onApprove={() => submit({
              projectId, logId,
              entityId: item.entityId,
              entityType: item.entityType,
              action: 'APPROVED',
            })}
            onReject={() => submit({
              projectId, logId,
              entityId: item.entityId,
              entityType: item.entityType,
              action: 'REJECTED',
            })}
          />
        )}
        ListHeaderComponent={
          data?.length ? (
            <SectionHeader title={`${data.length} Pending Review${data.length !== 1 ? 's' : ''}`} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState title="All Reviewed" message="No pending items for this log." icon="checkmark-circle-outline" />
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
});
