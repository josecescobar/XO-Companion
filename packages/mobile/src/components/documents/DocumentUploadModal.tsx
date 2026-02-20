import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUploadDocument } from '@/hooks/mutations/useDocumentMutations';
import { useTheme } from '@/hooks/useTheme';
import type { DocumentCategory } from '@/api/endpoints/documents';

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
}

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'DRAWING', label: 'Drawing' },
  { value: 'SPECIFICATION', label: 'Specification' },
  { value: 'SAFETY_MANUAL', label: 'Safety Manual' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'SUBMITTAL', label: 'Submittal' },
  { value: 'RFI', label: 'RFI' },
  { value: 'CHANGE_ORDER', label: 'Change Order' },
  { value: 'PERMIT', label: 'Permit' },
  { value: 'INSPECTION_REPORT', label: 'Inspection Report' },
  { value: 'MEETING_MINUTES', label: 'Meeting Minutes' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'OTHER', label: 'Other' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploadModal({
  visible,
  onClose,
  projectId,
}: DocumentUploadModalProps) {
  const { colors } = useTheme();
  const uploadMutation = useUploadDocument(projectId);

  const [file, setFile] = useState<{
    uri: string;
    name: string;
    size: number;
    mimeType: string;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('OTHER');
  const [description, setDescription] = useState('');

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'image/jpeg',
        'image/png',
        'image/tiff',
      ],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      });
      // Pre-fill title from filename minus extension
      const nameWithoutExt = asset.name.replace(/\.[^/.]+$/, '');
      if (!title) setTitle(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      Alert.alert('Required', 'Please select a file and enter a title.');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file: { uri: file.uri, type: file.mimeType, name: file.name },
        metadata: {
          title: title.trim(),
          category,
          description: description.trim() || undefined,
        },
      });
      // Reset state
      setFile(null);
      setTitle('');
      setCategory('OTHER');
      setDescription('');
      onClose();
    } catch (err) {
      Alert.alert(
        'Upload Failed',
        err instanceof Error ? err.message : 'Could not upload document.',
      );
    }
  };

  const handleClose = () => {
    setFile(null);
    setTitle('');
    setCategory('OTHER');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Upload Document
          </Text>
          <Pressable onPress={handleClose}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>
              Cancel
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* File Picker */}
          <Pressable
            onPress={handlePickFile}
            style={[
              styles.filePicker,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            {file ? (
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.text }]}>
                  {file.name}
                </Text>
                <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                  {formatFileSize(file.size)}
                </Text>
              </View>
            ) : (
              <View style={styles.filePrompt}>
                <Ionicons name="document-outline" size={36} color={colors.textTertiary} />
                <Text
                  style={[styles.filePromptText, { color: colors.textSecondary }]}
                >
                  Tap to select a file
                </Text>
                <Text
                  style={[styles.filePromptHint, { color: colors.textTertiary }]}
                >
                  PDF, text, images up to 50MB
                </Text>
              </View>
            )}
          </Pressable>

          <Input
            label="Title *"
            placeholder="Document title"
            value={title}
            onChangeText={setTitle}
          />

          {/* Category Picker */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[
                    styles.chip,
                    category === cat.value
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
                      styles.chipText,
                      {
                        color:
                          category === cat.value ? '#fff' : colors.textSecondary,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Input
            label="Description (optional)"
            placeholder="Brief description of the document..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />

          <Button
            title={uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
            onPress={handleUpload}
            loading={uploadMutation.isPending}
            disabled={uploadMutation.isPending || !file || !title.trim()}
            size="lg"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  cancelText: { fontSize: 16, fontWeight: '600' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  filePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
  },
  fileInfo: { alignItems: 'center', gap: 6 },
  fileName: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  fileSize: { fontSize: 14, fontWeight: '500' },
  filePrompt: { alignItems: 'center', gap: 10 },
  filePromptText: { fontSize: 16, fontWeight: '600' },
  filePromptHint: { fontSize: 13, fontWeight: '500' },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
});
