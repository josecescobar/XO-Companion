import { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, Alert, Share, ActivityIndicator, StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCommunication } from '@/hooks/queries/useCommunications';
import {
  useUpdateCommunication, useApproveCommunication, useSendCommunication,
  useCancelCommunication, useRedraftCommunication,
} from '@/hooks/mutations/useCommunicationMutations';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  EMAIL: 'mail-outline',
  TEXT: 'chatbubble-outline',
  CALL: 'call-outline',
  RFI: 'help-circle-outline',
  CHANGE_ORDER: 'swap-horizontal-outline',
};

const URGENCY_COLORS: Record<string, string> = {
  LOW: '#9ca3af', NORMAL: '#7C3AED', HIGH: '#dc2626',
};

export default function CommunicationDetailScreen() {
  const { projectId, commId } = useLocalSearchParams<{ projectId: string; commId: string }>();
  const { colors } = useTheme();
  const { data: comm, isLoading } = useCommunication(projectId, commId);

  const updateMutation = useUpdateCommunication(projectId);
  const approveMutation = useApproveCommunication(projectId);
  const sendMutation = useSendCommunication(projectId);
  const cancelMutation = useCancelCommunication(projectId);
  const redraftMutation = useRedraftCommunication(projectId);

  const [showOriginal, setShowOriginal] = useState(false);
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState<string | null>(null);
  const [editedRecipient, setEditedRecipient] = useState<string | null>(null);

  if (isLoading || !comm) return <LoadingState message="Loading communication..." />;

  const displayBody = editedBody ?? comm.editedBody ?? comm.body ?? '';
  const displaySubject = editedSubject ?? comm.subject;
  const displayRecipient = editedRecipient ?? comm.recipient;
  const isEditable = comm.status === 'DRAFT' || comm.status === 'APPROVED';
  const showEmailField = ['EMAIL', 'RFI', 'CHANGE_ORDER'].includes(comm.type);
  const showPhoneField = ['TEXT', 'CALL'].includes(comm.type);

  const handleSave = () => {
    const body: any = {};
    if (editedBody !== null) body.editedBody = editedBody;
    if (editedSubject !== null) body.subject = editedSubject;
    if (editedRecipient !== null) body.recipient = editedRecipient;
    if (Object.keys(body).length > 0) {
      updateMutation.mutate({ commId, body });
    }
  };

  const handleApprove = () => {
    handleSave();
    approveMutation.mutate(commId);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(displayBody);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  const handleShare = () => {
    Share.share({ message: `${displaySubject}\n\n${displayBody}` });
  };

  const statusHeader = (): { bg: string; color: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] } => {
    switch (comm.status) {
      case 'DRAFTING':
        return { bg: '#EDE9FE', color: '#7C3AED', label: 'AI is drafting...', icon: 'sparkles' };
      case 'DRAFT':
        return { bg: '#EDE9FE', color: '#7C3AED', label: 'Draft Ready for Review', icon: 'create-outline' };
      case 'APPROVED':
        return { bg: '#dcfce7', color: '#16a34a', label: 'Approved — Ready to Send', icon: 'checkmark-circle-outline' };
      case 'SENT':
        return { bg: '#f3f4f6', color: '#6b7280', label: `Sent${comm.sentAt ? ` on ${new Date(comm.sentAt).toLocaleDateString()}` : ''}`, icon: 'arrow-up-circle-outline' };
      case 'CANCELLED':
        return { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled', icon: 'close-circle-outline' };
    }
  };

  const sh = statusHeader();

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Draft Review' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Header */}
        <View style={[styles.statusHeader, { backgroundColor: sh.bg }]}>
          {comm.status === 'DRAFTING' && <ActivityIndicator size="small" color={sh.color} style={{ marginRight: 8 }} />}
          <Ionicons name={sh.icon} size={18} color={sh.color} style={{ marginRight: 6 }} />
          <Text style={[styles.statusLabel, { color: sh.color }]}>{sh.label}</Text>
        </View>

        {/* Type + Urgency */}
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, shadows.sm, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={TYPE_ICONS[comm.type] ?? 'mail-outline'} size={16} color={colors.text} />
              <Text>{comm.type.replace('_', ' ')}</Text>
            </View>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: URGENCY_COLORS[comm.urgency] + '20' }]}>
            <Text style={{ color: URGENCY_COLORS[comm.urgency], fontWeight: '600', fontSize: 12 }}>
              {comm.urgency}
            </Text>
          </View>
        </View>

        {/* Recipient Info */}
        <View style={[styles.section, shadows.md, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recipient</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={displayRecipient}
            onChangeText={setEditedRecipient}
            editable={isEditable}
            placeholder="Recipient name"
            placeholderTextColor={colors.textTertiary}
          />
          {showEmailField && (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={comm.recipientEmail ?? ''}
              editable={isEditable}
              placeholder="Email address"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
            />
          )}
          {showPhoneField && (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={comm.recipientPhone ?? ''}
              editable={isEditable}
              placeholder="Phone number"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          )}
        </View>

        {/* Subject */}
        <View style={[styles.section, shadows.md, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Subject</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={displaySubject}
            onChangeText={setEditedSubject}
            editable={isEditable}
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Message Body */}
        <View style={[styles.section, shadows.md, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Message</Text>
          {comm.status === 'DRAFTING' ? (
            <View style={styles.draftingPlaceholder}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.draftingText, { color: colors.textSecondary }]}>
                AI is drafting your message...
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.bodyInput, { color: colors.text, borderColor: colors.border }]}
                value={displayBody}
                onChangeText={setEditedBody}
                editable={isEditable}
                multiline
                textAlignVertical="top"
                placeholderTextColor={colors.textTertiary}
              />
              {comm.body && (editedBody !== null || comm.editedBody) && (
                <Pressable onPress={() => setShowOriginal(!showOriginal)}>
                  <Text style={[styles.toggleOriginal, { color: colors.primary }]}>
                    {showOriginal ? 'Hide' : 'Show'} original AI draft
                  </Text>
                </Pressable>
              )}
              {showOriginal && comm.body && (
                <View style={[styles.originalDraft, { backgroundColor: colors.background }]}>
                  <Text style={[styles.originalLabel, { color: colors.textTertiary }]}>Original AI Draft:</Text>
                  <Text style={[styles.originalText, { color: colors.textSecondary }]}>{comm.body}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Context */}
        {comm.context && (
          <View style={[styles.section, shadows.md, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Context</Text>
            <Text style={[styles.contextText, { color: colors.text }]}>{comm.context}</Text>
            {comm.voiceNoteId && (
              <Text style={[styles.voiceLink, { color: colors.primary }]}>Extracted from voice note</Text>
            )}
          </View>
        )}

        {comm.processingError && (
          <View style={[styles.errorCard, { backgroundColor: '#fee2e2' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={{ color: '#dc2626', fontSize: 13 }}>{comm.processingError}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionBar, shadows.lg, { backgroundColor: colors.surface }]}>
        {comm.status === 'DRAFT' && (
          <>
            <Button title="Approve" onPress={handleApprove} loading={approveMutation.isPending} />
            <View style={styles.actionRow}>
              <Button title="Redraft" variant="secondary" onPress={() => redraftMutation.mutate(commId)} loading={redraftMutation.isPending} size="sm" />
              <Button title="Cancel" variant="danger" onPress={() => cancelMutation.mutate(commId)} loading={cancelMutation.isPending} size="sm" />
            </View>
          </>
        )}
        {comm.status === 'APPROVED' && (
          <>
            <Button title="Mark as Sent" onPress={() => sendMutation.mutate(commId)} loading={sendMutation.isPending} />
            <View style={styles.actionRow}>
              <Button title="Copy" variant="secondary" onPress={handleCopy} size="sm" />
              <Button title="Share" variant="secondary" onPress={handleShare} size="sm" />
            </View>
          </>
        )}
        {comm.status === 'DRAFTING' && (
          <View style={styles.draftingActions}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.draftingActionText, { color: colors.textSecondary }]}>Waiting for AI draft...</Text>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  statusHeader: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 12, marginBottom: 12, minHeight: 48,
  },
  statusLabel: { fontSize: 15, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  urgencyBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  section: { borderRadius: 12, padding: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15, marginBottom: 8 },
  bodyInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15, minHeight: 200 },
  toggleOriginal: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  originalDraft: { borderRadius: 10, padding: 10, marginTop: 8 },
  originalLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  originalText: { fontSize: 14, lineHeight: 20 },
  contextText: { fontSize: 14, lineHeight: 20 },
  voiceLink: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  errorCard: { borderRadius: 10, padding: 10, marginBottom: 12 },
  draftingPlaceholder: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  draftingText: { fontSize: 15 },
  actionBar: { padding: 16, gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  draftingActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  draftingActionText: { fontSize: 14 },
});
