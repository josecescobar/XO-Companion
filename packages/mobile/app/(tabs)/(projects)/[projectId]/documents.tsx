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
import { format } from 'date-fns';
import { useProjectDocuments } from '@/hooks/queries/useDocuments';
import { useDeleteDocument } from '@/hooks/mutations/useDocumentMutations';
import { DocumentUploadModal } from '@/components/documents/DocumentUploadModal';
import { useTheme } from '@/hooks/useTheme';
import type { ProjectDocument, DocumentCategory } from '@/api/endpoints/documents';

const CATEGORY_ICONS: Record<string, string> = {
  DRAWING: '\u{1F4D0}',
  SPECIFICATION: '\u{1F4CB}',
  SAFETY_MANUAL: '\u{1F6E1}',
  CONTRACT: '\u{1F4DD}',
  SUBMITTAL: '\u{1F4E5}',
  RFI: '\u{2753}',
  CHANGE_ORDER: '\u{1F504}',
  PERMIT: '\u{1F3DB}',
  INSPECTION_REPORT: '\u{1F50D}',
  MEETING_MINUTES: '\u{1F4C4}',
  SCHEDULE: '\u{1F4C5}',
  OTHER: '\u{1F4C4}',
};

const FILTERS: { label: string; value: string | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Drawings', value: 'DRAWING' },
  { label: 'Specs', value: 'SPECIFICATION' },
  { label: 'Safety', value: 'SAFETY_MANUAL' },
  { label: 'Contracts', value: 'CONTRACT' },
  { label: 'Other', value: 'OTHER' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCategory(category: DocumentCategory): string {
  return category
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function DocumentsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { colors } = useTheme();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(
    undefined,
  );
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  const {
    data: documents,
    isLoading,
    refetch,
    isRefetching,
  } = useProjectDocuments(projectId, {
    category: categoryFilter,
  });

  const deleteMutation = useDeleteDocument(projectId);

  const handleDelete = (doc: ProjectDocument) => {
    Alert.alert('Delete Document', `Delete "${doc.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(doc.id),
      },
    ]);
  };

  const renderStatusBadge = (doc: ProjectDocument) => {
    switch (doc.status) {
      case 'PENDING':
      case 'PROCESSING':
        return (
          <View
            style={[styles.statusBadge, { backgroundColor: colors.warningLight }]}
          >
            <Text style={[styles.statusText, { color: colors.warning }]}>
              Processing...
            </Text>
          </View>
        );
      case 'COMPLETED':
        return (
          <View
            style={[styles.statusBadge, { backgroundColor: colors.successLight }]}
          >
            <Text style={[styles.statusText, { color: colors.success }]}>
              Ready ({doc.chunksCreated} chunks)
            </Text>
          </View>
        );
      case 'FAILED':
        return (
          <View
            style={[styles.statusBadge, { backgroundColor: colors.errorLight }]}
          >
            <Text style={[styles.statusText, { color: colors.error }]}>
              Failed
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderItem = ({ item }: { item: ProjectDocument }) => (
    <Pressable
      onLongPress={() => handleDelete(item)}
      style={[
        styles.docCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.docHeader}>
        <Text style={styles.docIcon}>
          {CATEGORY_ICONS[item.category] ?? '\u{1F4C4}'}
        </Text>
        <View style={styles.docInfo}>
          <Text
            style={[styles.docTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.docFileName, { color: colors.textSecondary }]}>
            {item.fileName} · {formatFileSize(item.fileSize)}
          </Text>
        </View>
      </View>
      <View style={styles.docFooter}>
        <View
          style={[styles.categoryBadge, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.categoryText, { color: colors.primary }]}>
            {formatCategory(item.category)}
          </Text>
        </View>
        {renderStatusBadge(item)}
        <Text style={[styles.docDate, { color: colors.textTertiary }]}>
          {format(new Date(item.createdAt), 'MMM d')}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Documents',
          headerRight: () => (
            <Pressable
              onPress={() => setUploadModalVisible(true)}
              style={styles.addButton}
            >
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                + Upload
              </Text>
            </Pressable>
          ),
        }}
      />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => setCategoryFilter(f.value)}
            style={[
              styles.filterChip,
              categoryFilter === f.value
                ? { backgroundColor: colors.primary }
                : {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    categoryFilter === f.value ? '#fff' : colors.textSecondary,
                },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={documents ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Loading documents...
            </Text>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No documents uploaded yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Upload drawings, specs, and safety manuals to make them searchable
                via Ask XO.
              </Text>
            </View>
          )
        }
      />

      <DocumentUploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        projectId={projectId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 16, paddingTop: 0 },
  docCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: { fontSize: 28 },
  docInfo: { flex: 1, gap: 2 },
  docTitle: { fontSize: 16, fontWeight: '600' },
  docFileName: { fontSize: 13 },
  docFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  docDate: { fontSize: 12, marginLeft: 'auto' },
  addButton: { marginRight: 8 },
  addButtonText: { fontSize: 16, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
