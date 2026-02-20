import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMediaCapture } from '@/hooks/useMediaCapture';
import { useProjectDocuments } from '@/hooks/queries/useDocuments';
import { useDailyLogs } from '@/hooks/queries/useDailyLogs';
import { useCreateInspection } from '@/hooks/mutations/useInspectionMutations';
import { uploadMedia } from '@/api/endpoints/media';
import { useTheme } from '@/hooks/useTheme';
import type { MediaAsset } from '@/hooks/useMediaCapture';
import type { InspectionType } from '@/api/endpoints/inspections';

const INSPECTION_TYPES: { key: InspectionType; label: string; icon: string }[] = [
  { key: 'DRAWING_COMPARISON', label: 'Drawing', icon: '\u{1F4D0}' },
  { key: 'SPEC_COMPLIANCE', label: 'Spec', icon: '\u{1F4CB}' },
  { key: 'SAFETY_CHECK', label: 'Safety', icon: '\u{1F6E1}' },
  { key: 'QUALITY_CHECK', label: 'Quality', icon: '\u{2705}' },
  { key: 'PROGRESS_PHOTO', label: 'Progress', icon: '\u{1F4F8}' },
  { key: 'GENERAL', label: 'General', icon: '\u{1F50D}' },
];

const CATEGORY_MAP: Record<string, string | undefined> = {
  DRAWING_COMPARISON: 'DRAWING',
  SPEC_COMPLIANCE: 'SPECIFICATION',
  SAFETY_CHECK: 'SAFETY_MANUAL',
};

export default function NewInspectionScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { takePhoto, pickFromLibrary } = useMediaCapture();
  const createInspection = useCreateInspection(projectId);

  const [photo, setPhoto] = useState<MediaAsset | null>(null);
  const [inspectionType, setInspectionType] = useState<InspectionType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const docCategory = inspectionType ? CATEGORY_MAP[inspectionType] : undefined;
  const { data: documents } = useProjectDocuments(projectId, docCategory ? { category: docCategory } : undefined);
  const { data: logs } = useDailyLogs(projectId);

  const canSubmit = !!photo && !!inspectionType && !!title.trim() && !submitting;

  const handleTakePhoto = async () => {
    const asset = await takePhoto();
    if (asset) setPhoto(asset);
  };

  const handlePickFromLibrary = async () => {
    const asset = await pickFromLibrary();
    if (asset) setPhoto(asset);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !photo || !inspectionType) return;
    setSubmitting(true);

    try {
      // 1. Upload the photo
      setSubmitStatus('Uploading photo...');
      const media = await uploadMedia(
        projectId,
        { uri: photo.uri, type: photo.type === 'video' ? 'video/mp4' : 'image/jpeg', name: photo.fileName },
        { type: 'PHOTO' },
      );

      // 2. Create inspection
      setSubmitStatus('Starting AI analysis...');
      const inspection = await createInspection.mutateAsync({
        mediaId: media.id,
        documentId: selectedDocId || undefined,
        dailyLogId: selectedLogId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        inspectionType,
      });

      // 3. Navigate to results
      router.replace(`/(tabs)/(projects)/${projectId}/inspections/${inspection.id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create inspection');
    } finally {
      setSubmitting(false);
      setSubmitStatus('');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'New Inspection' }} />

      {/* Photo Capture */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PHOTO *</Text>
        {photo ? (
          <View>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <Pressable onPress={() => setPhoto(null)} style={[styles.retakeBtn, { backgroundColor: colors.surface }]}>
              <Text style={[styles.retakeBtnText, { color: colors.error }]}>Retake</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.captureArea}>
            <Pressable
              onPress={handleTakePhoto}
              style={[styles.captureButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.captureIcon}>{'\u{1F4F7}'}</Text>
              <Text style={styles.captureText}>Take Photo of Work</Text>
            </Pressable>
            <Pressable
              onPress={handlePickFromLibrary}
              style={[styles.libraryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.libraryText, { color: colors.textSecondary }]}>{'\u{1F4CE}'} Pick from Library</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Inspection Type */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>INSPECTION TYPE *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
          {INSPECTION_TYPES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => {
                setInspectionType(t.key);
                setSelectedDocId(null);
              }}
              style={[
                styles.typeChip,
                {
                  backgroundColor: inspectionType === t.key ? colors.primary : colors.surface,
                  borderColor: inspectionType === t.key ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text style={[styles.typeLabel, { color: inspectionType === t.key ? '#fff' : colors.text }]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Title */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TITLE *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="e.g. Foundation wall east elevation"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
        <TextInput
          style={[styles.input, styles.multilineInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Add details about what you're inspecting..."
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Reference Document */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REFERENCE DOCUMENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docRow}>
          <Pressable
            onPress={() => setSelectedDocId(null)}
            style={[
              styles.docChip,
              {
                backgroundColor: !selectedDocId ? colors.primaryLight : colors.surface,
                borderColor: !selectedDocId ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.docChipText, { color: !selectedDocId ? colors.primary : colors.textSecondary }]}>
              None
            </Text>
          </Pressable>
          {(documents || []).map((doc) => (
            <Pressable
              key={doc.id}
              onPress={() => setSelectedDocId(doc.id)}
              style={[
                styles.docChip,
                {
                  backgroundColor: selectedDocId === doc.id ? colors.primaryLight : colors.surface,
                  borderColor: selectedDocId === doc.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[styles.docChipText, { color: selectedDocId === doc.id ? colors.primary : colors.text }]}
                numberOfLines={1}
              >
                {doc.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          AI will also search all project documents for relevant context
        </Text>
      </View>

      {/* Daily Log Link */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LINK TO DAILY LOG</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docRow}>
          <Pressable
            onPress={() => setSelectedLogId(null)}
            style={[
              styles.docChip,
              {
                backgroundColor: !selectedLogId ? colors.primaryLight : colors.surface,
                borderColor: !selectedLogId ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.docChipText, { color: !selectedLogId ? colors.primary : colors.textSecondary }]}>
              None
            </Text>
          </Pressable>
          {(logs || []).slice(0, 5).map((log) => (
            <Pressable
              key={log.id}
              onPress={() => setSelectedLogId(log.id)}
              style={[
                styles.docChip,
                {
                  backgroundColor: selectedLogId === log.id ? colors.primaryLight : colors.surface,
                  borderColor: selectedLogId === log.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[styles.docChipText, { color: selectedLogId === log.id ? colors.primary : colors.text }]}
                numberOfLines={1}
              >
                {new Date(log.logDate).toLocaleDateString()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Submit */}
      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primary : colors.border }]}
      >
        {submitting ? (
          <View style={styles.submitRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.submitText}>{submitStatus}</Text>
          </View>
        ) : (
          <Text style={styles.submitText}>{'\u{1F50D}'} Run AI Inspection</Text>
        )}
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  // Photo
  captureArea: { gap: 10 },
  captureButton: {
    height: 200,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  captureIcon: { fontSize: 40 },
  captureText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  libraryButton: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  libraryText: { fontSize: 15, fontWeight: '500' },
  photoPreview: { width: '100%', height: 200, borderRadius: 14, resizeMode: 'cover' },
  retakeBtn: { position: 'absolute', top: 10, right: 10, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  retakeBtnText: { fontSize: 14, fontWeight: '600' },
  // Type chips
  typeRow: { gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeIcon: { fontSize: 16 },
  typeLabel: { fontSize: 14, fontWeight: '600' },
  // Inputs
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  // Documents
  docRow: { gap: 8 },
  docChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 180,
  },
  docChipText: { fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 6 },
  // Submit
  submitBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
