import { useState } from 'react';
import { ScrollView, View, Text, Image, Pressable, RefreshControl, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useDailyLog } from '@/hooks/queries/useDailyLogs';
import { useAuthStore } from '@/stores/auth.store';
import { getStatusAction } from '@/lib/permissions';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { CollapsibleSection } from '@/components/daily-log/CollapsibleSection';
import { StatusActionButton } from '@/components/daily-log/StatusActionButton';
import { WeatherSection } from '@/components/daily-log/WeatherSection';
import { WorkforceSection } from '@/components/daily-log/WorkforceSection';
import { EquipmentSection } from '@/components/daily-log/EquipmentSection';
import { WorkCompletedSection } from '@/components/daily-log/WorkCompletedSection';
import { MaterialsSection } from '@/components/daily-log/MaterialsSection';
import { SafetySection } from '@/components/daily-log/SafetySection';
import { DelaysSection } from '@/components/daily-log/DelaysSection';
import { EntryEditModal } from '@/components/daily-log/EntryEditModal';
import { MediaAttachmentBar } from '@/components/media/MediaAttachmentBar';
import { MediaPreviewModal } from '@/components/media/MediaPreviewModal';
import { useLogMedia } from '@/hooks/queries/useMedia';
import { useUploadMedia } from '@/hooks/mutations/useMediaMutations';
import { useProjectInspections } from '@/hooks/queries/useInspections';
import { useProjectCommunications } from '@/hooks/queries/useCommunications';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';
import { deleteEntry } from '@/api/endpoints/daily-logs';
import type { EntityType } from '@/api/endpoints/daily-logs';
import type { MediaAsset } from '@/hooks/useMediaCapture';

export default function DailyLogDetailScreen() {
  const { projectId, logId } = useLocalSearchParams<{ projectId: string; logId: string }>();
  const router = useRouter();
  const { data: log, isLoading, error, refetch, isRefetching } = useDailyLog(projectId, logId);
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();

  const [editModal, setEditModal] = useState<{
    visible: boolean;
    entityType: EntityType;
    entry: Record<string, unknown> | null;
  }>({ visible: false, entityType: 'workforce', entry: null });

  const [mediaAttachments, setMediaAttachments] = useState<MediaAsset[]>([]);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const { data: existingMedia } = useLogMedia(projectId, logId);
  const uploadMutation = useUploadMedia(projectId);
  const { data: logInspections } = useProjectInspections(projectId, { dailyLogId: logId });
  const { data: allComms } = useProjectCommunications(projectId);
  const logComms = allComms?.filter((c) => c.dailyLogId === logId) ?? [];

  const handleAddMedia = async (asset: MediaAsset) => {
    setMediaAttachments((prev) => [...prev, asset]);
    try {
      await uploadMutation.mutateAsync({
        file: {
          uri: asset.uri,
          type: asset.type === 'photo' ? 'image/jpeg' : 'video/mp4',
          name: asset.fileName,
        },
        metadata: {
          type: asset.type === 'photo' ? 'PHOTO' : 'VIDEO',
          dailyLogId: logId,
        },
      });
    } catch {
      Alert.alert('Upload Failed', 'Could not upload media.');
    }
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: colors.border, text: colors.textSecondary },
    PENDING_REVIEW: { bg: colors.primaryLight, text: colors.primary },
    APPROVED: { bg: colors.successLight, text: colors.success },
    REJECTED: { bg: colors.errorLight, text: colors.error },
    AMENDED: { bg: colors.warningLight, text: colors.warning },
  };

  if (isLoading) return <LoadingState message="Loading daily log..." />;
  if (error || !log) return <ErrorState message="Failed to load daily log" onRetry={refetch} />;

  const sc = statusColors[log.status] ?? statusColors.DRAFT;
  const statusAction = getStatusAction(log.status, user?.role);
  const editable = log.status === 'DRAFT' || log.status === 'AMENDED';

  const openEdit = (entityType: EntityType, entry?: Record<string, unknown>) => {
    setEditModal({ visible: true, entityType, entry: entry ?? null });
  };

  const closeEdit = () => {
    setEditModal({ visible: false, entityType: 'workforce', entry: null });
  };

  const handleDelete = (entityType: EntityType, entryId: string) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(projectId, logId, entityType, entryId);
            refetch();
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: format(new Date(log.logDate), 'MMM d, yyyy') }} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.date, { color: colors.text }]}>{format(new Date(log.logDate), 'EEEE, MMM d, yyyy')}</Text>
            <Text style={[styles.author, { color: colors.textSecondary }]}>
              by {log.createdBy.firstName} {log.createdBy.lastName}
              {log.reportNumber ? ` · Report #${log.reportNumber}` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{log.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {log.notes && <View style={[styles.notesBox, { backgroundColor: colors.primaryLight }]}><Text style={[styles.notesText, { color: colors.text }]}>{log.notes}</Text></View>}

        {log.weather && (
          <CollapsibleSection title="Weather" defaultOpen>
            <WeatherSection weather={log.weather} editable={editable} onEdit={() => openEdit('weather', log.weather as unknown as Record<string, unknown>)} />
          </CollapsibleSection>
        )}
        {log.workforce.length > 0 && (
          <CollapsibleSection title="Workforce" count={log.workforce.length} defaultOpen>
            <WorkforceSection
              entries={log.workforce}
              editable={editable}
              onEdit={(entry) => openEdit('workforce', entry as unknown as Record<string, unknown>)}
              onDelete={(id) => handleDelete('workforce', id)}
              onAdd={() => openEdit('workforce')}
            />
          </CollapsibleSection>
        )}
        {log.equipment.length > 0 && (
          <CollapsibleSection title="Equipment" count={log.equipment.length}>
            <EquipmentSection
              entries={log.equipment}
              editable={editable}
              onEdit={(entry) => openEdit('equipment', entry as unknown as Record<string, unknown>)}
              onDelete={(id) => handleDelete('equipment', id)}
              onAdd={() => openEdit('equipment')}
            />
          </CollapsibleSection>
        )}
        {log.workCompleted.length > 0 && (
          <CollapsibleSection title="Work Completed" count={log.workCompleted.length}>
            <WorkCompletedSection
              entries={log.workCompleted}
              editable={editable}
              onEdit={(entry) => openEdit('workCompleted', entry as unknown as Record<string, unknown>)}
              onDelete={(id) => handleDelete('workCompleted', id)}
              onAdd={() => openEdit('workCompleted')}
            />
          </CollapsibleSection>
        )}
        {log.materials.length > 0 && (
          <CollapsibleSection title="Materials" count={log.materials.length}>
            <MaterialsSection
              entries={log.materials}
              editable={editable}
              onEdit={(entry) => openEdit('materials', entry as unknown as Record<string, unknown>)}
              onDelete={(id) => handleDelete('materials', id)}
              onAdd={() => openEdit('materials')}
            />
          </CollapsibleSection>
        )}
        {log.safety && (
          <CollapsibleSection title="Safety">
            <SafetySection safety={log.safety} editable={editable} onEdit={() => openEdit('safety', log.safety as unknown as Record<string, unknown>)} />
          </CollapsibleSection>
        )}
        {log.delays.length > 0 && (
          <CollapsibleSection title="Delays" count={log.delays.length}>
            <DelaysSection
              entries={log.delays}
              editable={editable}
              onEdit={(entry) => openEdit('delays', entry as unknown as Record<string, unknown>)}
              onDelete={(id) => handleDelete('delays', id)}
              onAdd={() => openEdit('delays')}
            />
          </CollapsibleSection>
        )}

        {/* Status Action */}
        {statusAction && (
          <View style={styles.actionSection}>
            <StatusActionButton
              action={statusAction}
              projectId={projectId}
              logId={logId}
            />
          </View>
        )}

        {/* Media Attachments */}
        <View style={styles.mediaSection}>
          <View style={styles.mediaSectionHeader}>
            <Text style={[styles.mediaSectionTitle, { color: colors.text }]}>Photos & Video</Text>
            {(existingMedia?.length ?? 0) > 0 && (
              <View style={[styles.mediaBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.mediaBadgeText, { color: colors.primary }]}>{existingMedia!.length}</Text>
              </View>
            )}
          </View>
          <MediaAttachmentBar
            attachments={mediaAttachments}
            onAdd={handleAddMedia}
            onRemove={(i) => setMediaAttachments((prev) => prev.filter((_, idx) => idx !== i))}
            onPreview={(i) => setPreviewIndex(i)}
          />
          {uploadMutation.isPending && (
            <Text style={[styles.uploadingText, { color: colors.primary }]}>Uploading...</Text>
          )}
          {(existingMedia?.length ?? 0) > 0 && (
            <Text style={[styles.existingMediaText, { color: colors.textSecondary }]}>
              {existingMedia!.filter((m) => m.type === 'PHOTO').length} photos, {existingMedia!.filter((m) => m.type === 'VIDEO').length} videos uploaded
            </Text>
          )}
        </View>

        {/* AI Inspection */}
        <View style={styles.inspectionSection}>
          <View style={styles.mediaSectionHeader}>
            <Text style={[styles.mediaSectionTitle, { color: colors.text }]}>AI Inspection</Text>
            {(logInspections?.length ?? 0) > 0 && (
              <View style={[styles.mediaBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.mediaBadgeText, { color: colors.primary }]}>{logInspections!.length}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push(`/(tabs)/(projects)/${projectId}/inspections/new?dailyLogId=${logId}`)}
            style={[styles.inspectButton, { backgroundColor: '#7C3AED' }]}
          >
            <Text style={styles.inspectButtonText}>{'\u{1F50D}'} Run AI Inspection</Text>
          </Pressable>
          {logInspections && logInspections.length > 0 && logInspections.map((insp) => {
            const barColors: Record<string, string> = {
              PASS: '#16A34A', FAIL: '#DC2626', NEEDS_ATTENTION: '#D97706',
              PENDING: '#9CA3AF', PROCESSING: '#2563EB', INCONCLUSIVE: '#6B7280',
            };
            const bc = barColors[insp.status] || '#9CA3AF';
            return (
              <Pressable
                key={insp.id}
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/inspections/${insp.id}`)}
                style={[styles.inspectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: bc }]}
              >
                <Text style={[styles.inspectionCardTitle, { color: colors.text }]} numberOfLines={1}>
                  {insp.title}
                </Text>
                <View style={styles.inspectionCardMeta}>
                  <Text style={[styles.inspectionCardStatus, { color: bc }]}>{insp.status.replace('_', ' ')}</Text>
                  {insp.aiOverallScore != null && (
                    <Text style={[styles.inspectionCardScore, { color: colors.textSecondary }]}>{insp.aiOverallScore}/100</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Communications */}
        <View style={styles.inspectionSection}>
          <View style={styles.mediaSectionHeader}>
            <Text style={[styles.mediaSectionTitle, { color: colors.text }]}>Communications</Text>
            {logComms.length > 0 && (
              <View style={[styles.mediaBadge, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.mediaBadgeText, { color: '#2563eb' }]}>{logComms.length}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push(`/(tabs)/(projects)/${projectId}/communications/new` as any)}
            style={[styles.inspectButton, { backgroundColor: '#2563eb' }]}
          >
            <Text style={styles.inspectButtonText}>Draft New Communication</Text>
          </Pressable>
          {logComms.map((comm) => {
            const typeIcons: Record<string, string> = {
              EMAIL: '\u{1F4E7}', TEXT: '\u{1F4AC}', CALL: '\u{1F4DE}', RFI: '\u{2753}', CHANGE_ORDER: '\u{1F504}',
            };
            const statusColors2: Record<string, string> = {
              DRAFTING: '#2563eb', DRAFT: '#2563eb', APPROVED: '#16a34a', SENT: '#6b7280', CANCELLED: '#dc2626',
            };
            const sc2 = statusColors2[comm.status] || '#9CA3AF';
            return (
              <Pressable
                key={comm.id}
                onPress={() => router.push(`/(tabs)/(projects)/${projectId}/communications/${comm.id}` as any)}
                style={[styles.inspectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: sc2 }]}
              >
                <Text style={[styles.inspectionCardTitle, { color: colors.text }]} numberOfLines={1}>
                  {typeIcons[comm.type] ?? '\u{2709}\u{FE0F}'} {comm.subject}
                </Text>
                <View style={styles.inspectionCardMeta}>
                  <Text style={[styles.inspectionCardStatus, { color: sc2 }]}>{comm.status}</Text>
                  <Text style={[styles.inspectionCardScore, { color: colors.textSecondary }]}>To: {comm.recipient}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Navigation to sub-screens */}
        <View style={styles.navSection}>
          <Pressable
            onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs/${logId}/voice`)}
            style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.navButtonTitle, { color: colors.text }]}>Voice Notes</Text>
              <Text style={[styles.navButtonSub, { color: colors.textSecondary }]}>{log.voiceNotes.length} note{log.voiceNotes.length !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={[styles.navArrow, { color: colors.textTertiary }]}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs/${logId}/review`)}
            style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.navButtonTitle, { color: colors.text }]}>AI Review</Text>
              <Text style={[styles.navButtonSub, { color: colors.textSecondary }]}>Review extracted data</Text>
            </View>
            <Text style={[styles.navArrow, { color: colors.textTertiary }]}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/(tabs)/(projects)/${projectId}/daily-logs/${logId}/history`)}
            style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.navButtonTitle, { color: colors.text }]}>Review History</Text>
              <Text style={[styles.navButtonSub, { color: colors.textSecondary }]}>View review actions</Text>
            </View>
            <Text style={[styles.navArrow, { color: colors.textTertiary }]}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
      <MediaPreviewModal
        visible={previewIndex >= 0}
        items={mediaAttachments}
        initialIndex={Math.max(0, previewIndex)}
        onClose={() => setPreviewIndex(-1)}
        onDelete={(i) => {
          setMediaAttachments((prev) => prev.filter((_, idx) => idx !== i));
          if (mediaAttachments.length <= 1) setPreviewIndex(-1);
        }}
      />
      <EntryEditModal
        visible={editModal.visible}
        entityType={editModal.entityType}
        entry={editModal.entry}
        projectId={projectId}
        logId={logId}
        onClose={closeEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  date: { fontSize: 20, fontWeight: '700' },
  author: { fontSize: 14, marginTop: 4 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  notesBox: { borderRadius: 8, padding: 12, marginBottom: 16 },
  notesText: { fontSize: 16 },
  actionSection: { marginTop: 16 },
  navSection: { marginTop: 16, gap: 8 },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  navButtonTitle: { fontSize: 16, fontWeight: '600' },
  navButtonSub: { fontSize: 13, marginTop: 2 },
  navArrow: { fontSize: 24, marginLeft: 8 },
  mediaSection: { marginTop: 16, gap: 8 },
  mediaSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mediaSectionTitle: { fontSize: 17, fontWeight: '700' },
  mediaBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  mediaBadgeText: { fontSize: 12, fontWeight: '700' },
  uploadingText: { fontSize: 13, fontWeight: '500' },
  existingMediaText: { fontSize: 13 },
  // Inspection
  inspectionSection: { marginTop: 16, gap: 8 },
  inspectButton: { borderRadius: 12, padding: 14, alignItems: 'center' },
  inspectButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  inspectionCard: { borderRadius: 10, borderWidth: 1, borderLeftWidth: 4, padding: 12 },
  inspectionCardTitle: { fontSize: 14, fontWeight: '600' },
  inspectionCardMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  inspectionCardStatus: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  inspectionCardScore: { fontSize: 12 },
});
