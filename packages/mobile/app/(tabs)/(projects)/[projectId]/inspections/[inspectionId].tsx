import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useInspection } from '@/hooks/queries/useInspections';
import { useReviewInspection } from '@/hooks/mutations/useInspectionMutations';
import { useTheme } from '@/hooks/useTheme';
import type { InspectionFinding, InspectionStatus } from '@/api/endpoints/inspections';

const SEVERITY_CONFIG: Record<string, { color: string; icon: string; order: number }> = {
  CRITICAL: { color: '#DC2626', icon: '\u{1F534}', order: 0 },
  MAJOR: { color: '#EA580C', icon: '\u{1F7E0}', order: 1 },
  MINOR: { color: '#CA8A04', icon: '\u{1F7E1}', order: 2 },
  OBSERVATION: { color: '#2563EB', icon: '\u{1F535}', order: 3 },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  PENDING: { bg: '#E5E7EB', text: '#6B7280', label: 'Pending', icon: '\u{23F3}' },
  PROCESSING: { bg: '#DBEAFE', text: '#2563EB', label: 'Analyzing...', icon: '\u{1F50D}' },
  PASS: { bg: '#DCFCE7', text: '#16A34A', label: 'PASS', icon: '\u{2705}' },
  FAIL: { bg: '#FEE2E2', text: '#DC2626', label: 'FAIL', icon: '\u{274C}' },
  NEEDS_ATTENTION: { bg: '#FEF3C7', text: '#D97706', label: 'Needs Attention', icon: '\u{26A0}\u{FE0F}' },
  INCONCLUSIVE: { bg: '#F3F4F6', text: '#6B7280', label: 'Inconclusive', icon: '\u{2753}' },
};

export default function InspectionResultScreen() {
  const { projectId, inspectionId } = useLocalSearchParams<{ projectId: string; inspectionId: string }>();
  const { data: inspection, isLoading } = useInspection(projectId, inspectionId);
  const reviewMutation = useReviewInspection(projectId);
  const { colors } = useTheme();

  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  const [showOverride, setShowOverride] = useState(false);
  const [overrideResult, setOverrideResult] = useState<InspectionStatus>('PASS');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [showSpecs, setShowSpecs] = useState(false);

  if (isLoading || !inspection) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading inspection...</Text>
      </View>
    );
  }

  const statusConf = STATUS_CONFIG[inspection.status] || STATUS_CONFIG.PENDING;
  const isProcessing = inspection.status === 'PENDING' || inspection.status === 'PROCESSING';
  const findings = inspection.aiFindings?.findings || [];
  const sortedFindings = [...findings].sort(
    (a, b) => (SEVERITY_CONFIG[a.severity]?.order ?? 9) - (SEVERITY_CONFIG[b.severity]?.order ?? 9),
  );

  const toggleFinding = (idx: number) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleConfirm = () => {
    reviewMutation.mutate({
      inspectionId,
      result: inspection.status as InspectionStatus,
      notes: 'Confirmed AI assessment',
    });
  };

  const handleOverrideSubmit = () => {
    if (!overrideNotes.trim()) {
      Alert.alert('Notes Required', 'Please provide notes when overriding the AI assessment.');
      return;
    }
    reviewMutation.mutate({
      inspectionId,
      result: overrideResult,
      notes: overrideNotes.trim(),
    });
    setShowOverride(false);
  };

  const formatResultsText = () => {
    let text = `AI Inspection: ${inspection.title}\nStatus: ${statusConf.label}`;
    if (inspection.aiOverallScore != null) text += ` (${inspection.aiOverallScore}/100)`;
    if (inspection.aiAnalysis) text += `\n\n${inspection.aiAnalysis}`;
    if (sortedFindings.length > 0) {
      text += '\n\nFindings:';
      sortedFindings.forEach((f, i) => {
        text += `\n${i + 1}. [${f.severity}] ${f.description}`;
        if (f.recommendation) text += ` - ${f.recommendation}`;
      });
    }
    return text;
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(formatResultsText());
    Alert.alert('Copied', 'Inspection results copied to clipboard');
  };

  const handleShare = () => {
    Share.share({ message: formatResultsText() });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: inspection.title }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <View style={[styles.statusHeader, { backgroundColor: statusConf.bg }]}>
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color={statusConf.text} />
              <Text style={[styles.statusLabel, { color: statusConf.text }]}>
                {statusConf.icon} AI is analyzing your photo...
              </Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: statusConf.text }]}>
                {statusConf.icon} {statusConf.label}
              </Text>
              {inspection.aiOverallScore != null && (
                <View style={[styles.scoreBadge, { backgroundColor: statusConf.text }]}>
                  <Text style={styles.scoreText}>{inspection.aiOverallScore}/100</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Photo + Document Reference */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{inspection.title}</Text>
          {inspection.description && (
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{inspection.description}</Text>
          )}
          {inspection.document && (
            <View style={[styles.docRef, { backgroundColor: colors.background }]}>
              <Text style={[styles.docRefText, { color: colors.textSecondary }]}>
                Reference: {inspection.document.title} ({inspection.document.category})
              </Text>
            </View>
          )}
        </View>

        {/* AI Summary */}
        {inspection.aiAnalysis && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>AI Summary</Text>
            <Text style={[styles.summaryText, { color: colors.text }]}>{inspection.aiAnalysis}</Text>
            {inspection.aiFindings?.photoCoverage && (
              <Text style={[styles.coverageText, { color: colors.textTertiary }]}>
                Photo Coverage: {inspection.aiFindings.photoCoverage}
              </Text>
            )}
          </View>
        )}

        {/* Findings */}
        {sortedFindings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Findings ({sortedFindings.length})
            </Text>
            {sortedFindings.map((finding, idx) => {
              const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.OBSERVATION;
              const expanded = expandedFindings.has(idx);
              return (
                <Pressable
                  key={idx}
                  onPress={() => toggleFinding(idx)}
                  style={[styles.findingCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: sev.color }]}
                >
                  <View style={styles.findingHeader}>
                    <View style={styles.findingBadges}>
                      <View style={[styles.severityBadge, { backgroundColor: sev.color }]}>
                        <Text style={styles.severityText}>{finding.severity}</Text>
                      </View>
                      <View style={[styles.categoryBadge, { backgroundColor: colors.background }]}>
                        <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{finding.category}</Text>
                      </View>
                    </View>
                    <Text style={[styles.expandIcon, { color: colors.textTertiary }]}>
                      {expanded ? '\u{25B2}' : '\u{25BC}'}
                    </Text>
                  </View>
                  <Text style={[styles.findingDesc, { color: colors.text }]}>{finding.description}</Text>
                  {expanded && (
                    <View style={styles.findingDetails}>
                      {finding.expectedCondition && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expected:</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{finding.expectedCondition}</Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Actual:</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{finding.actualCondition}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Recommendation:</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{finding.recommendation}</Text>
                      </View>
                      <Text style={[styles.confidence, { color: colors.textTertiary }]}>
                        Confidence: {Math.round(finding.confidence * 100)}%
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Spec References */}
        {inspection.aiFindings?.specReferences && inspection.aiFindings.specReferences.length > 0 && (
          <Pressable
            onPress={() => setShowSpecs(!showSpecs)}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Spec References ({inspection.aiFindings.specReferences.length}) {showSpecs ? '\u{25B2}' : '\u{25BC}'}
            </Text>
            {showSpecs && inspection.aiFindings.specReferences.map((ref, idx) => (
              <Text key={idx} style={[styles.specRef, { color: colors.textSecondary }]}>
                {'\u{2022}'} {ref}
              </Text>
            ))}
          </Pressable>
        )}

        {/* Human Review */}
        {!isProcessing && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Human Review</Text>
            {inspection.reviewedBy ? (
              <View>
                <Text style={[styles.reviewedText, { color: colors.textSecondary }]}>
                  Reviewed by {inspection.reviewedBy.firstName} {inspection.reviewedBy.lastName}
                  {inspection.reviewedAt && ` on ${new Date(inspection.reviewedAt).toLocaleDateString()}`}
                </Text>
                {inspection.reviewNotes && (
                  <Text style={[styles.reviewNotes, { color: colors.text }]}>{inspection.reviewNotes}</Text>
                )}
              </View>
            ) : showOverride ? (
              <View style={styles.overrideForm}>
                <View style={styles.overrideOptions}>
                  {(['PASS', 'FAIL', 'NEEDS_ATTENTION', 'INCONCLUSIVE'] as InspectionStatus[]).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setOverrideResult(r)}
                      style={[
                        styles.overrideChip,
                        {
                          backgroundColor: overrideResult === r ? (STATUS_CONFIG[r]?.bg || colors.surface) : colors.background,
                          borderColor: overrideResult === r ? (STATUS_CONFIG[r]?.text || colors.primary) : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: STATUS_CONFIG[r]?.text || colors.text, fontSize: 13, fontWeight: '600' }}>
                        {STATUS_CONFIG[r]?.label || r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Notes (required for override)..."
                  placeholderTextColor={colors.textTertiary}
                  value={overrideNotes}
                  onChangeText={setOverrideNotes}
                  multiline
                />
                <View style={styles.overrideActions}>
                  <Pressable onPress={() => setShowOverride(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleOverrideSubmit}
                    disabled={reviewMutation.isPending}
                    style={[styles.overrideSubmitBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.overrideSubmitText}>Submit Override</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.reviewActions}>
                <Pressable
                  onPress={handleConfirm}
                  disabled={reviewMutation.isPending}
                  style={[styles.confirmBtn, { backgroundColor: '#16A34A' }]}
                >
                  <Text style={styles.confirmBtnText}>{'\u{2705}'} Confirm</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowOverride(true)}
                  style={[styles.overrideBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Text style={[styles.overrideBtnText, { color: colors.error }]}>{'\u{274C}'} Override</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {inspection.processingError && (
          <View style={[styles.card, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Processing Error</Text>
            <Text style={{ color: '#991B1B', fontSize: 14 }}>{inspection.processingError}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar */}
      {!isProcessing && (
        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={handleCopy} style={[styles.actionBtn, { borderColor: colors.border }]}>
            <Text style={[styles.actionBtnText, { color: colors.text }]}>{'\u{1F4CB}'} Copy</Text>
          </Pressable>
          <Pressable onPress={handleShare} style={[styles.actionBtn, { borderColor: colors.border }]}>
            <Text style={[styles.actionBtnText, { color: colors.text }]}>{'\u{1F4E4}'} Share</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 15 },
  scrollContent: { padding: 16 },
  // Status Header
  statusHeader: { borderRadius: 14, padding: 18, marginBottom: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusLabel: { fontSize: 20, fontWeight: '800' },
  scoreBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  scoreText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  // Cards
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  summaryText: { fontSize: 15, lineHeight: 22 },
  coverageText: { fontSize: 13, marginTop: 10, fontStyle: 'italic' },
  docRef: { borderRadius: 8, padding: 10, marginTop: 10 },
  docRefText: { fontSize: 13 },
  // Findings
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  findingCard: { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, padding: 14, marginBottom: 10 },
  findingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  findingBadges: { flexDirection: 'row', gap: 6 },
  severityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, fontWeight: '600' },
  expandIcon: { fontSize: 12 },
  findingDesc: { fontSize: 14, lineHeight: 20 },
  findingDetails: { marginTop: 12, gap: 8 },
  detailRow: { gap: 2 },
  detailLabel: { fontSize: 12, fontWeight: '700' },
  detailValue: { fontSize: 14, lineHeight: 20 },
  confidence: { fontSize: 12, marginTop: 4 },
  // Spec References
  specRef: { fontSize: 14, lineHeight: 22, marginTop: 4 },
  // Review
  reviewActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  overrideBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 14, alignItems: 'center' },
  overrideBtnText: { fontSize: 15, fontWeight: '700' },
  reviewedText: { fontSize: 14 },
  reviewNotes: { fontSize: 14, marginTop: 6, fontStyle: 'italic' },
  overrideForm: { gap: 12 },
  overrideOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  overrideChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  notesInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, minHeight: 60, textAlignVertical: 'top' },
  overrideActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  overrideSubmitBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  overrideSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Action Bar
  actionBar: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  actionBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
});
