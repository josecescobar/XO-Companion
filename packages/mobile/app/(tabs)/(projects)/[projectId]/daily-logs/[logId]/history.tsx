import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useReviewHistory } from '@/hooks/queries/useReviews';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';
import type { ReviewAuditEntry } from '@/api/endpoints/reviews';

const ACTION_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  APPROVED: 'success',
  REJECTED: 'error',
  MODIFIED: 'warning',
};

function formatEntityType(entityType: string): string {
  return entityType
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReviewHistoryScreen() {
  const { projectId, logId } = useLocalSearchParams<{ projectId: string; logId: string }>();
  const { data, isLoading, refetch, isRefetching } = useReviewHistory(projectId, logId);
  const { colors } = useTheme();

  if (isLoading) return <LoadingState message="Loading review history..." />;

  const renderItem = ({ item }: { item: ReviewAuditEntry }) => {
    const variant = ACTION_VARIANT[item.action] ?? 'default';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Badge label={item.action} variant={variant} />
          <Text style={[styles.entityType, { color: colors.text }]}>
            {formatEntityType(item.entityType)}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
          {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
        </Text>
        {item.comment ? (
          <Text style={[styles.comment, { color: colors.textSecondary }]}>
            {item.comment}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Review History' }} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            title="No Review History"
            message="No review actions have been recorded for this log yet."
          />
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  entityType: {
    fontSize: 15,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 13,
    marginBottom: 4,
  },
  comment: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
