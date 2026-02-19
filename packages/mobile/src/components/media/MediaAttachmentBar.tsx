import { View, Text, Image, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { useMediaCapture } from '@/hooks/useMediaCapture';
import { useTheme } from '@/hooks/useTheme';
import type { MediaAsset } from '@/hooks/useMediaCapture';

interface MediaAttachmentBarProps {
  attachments: MediaAsset[];
  onAdd: (asset: MediaAsset) => void;
  onRemove: (index: number) => void;
  onPreview?: (index: number) => void;
  maxAttachments?: number;
}

export function MediaAttachmentBar({
  attachments,
  onAdd,
  onRemove,
  onPreview,
  maxAttachments = 10,
}: MediaAttachmentBarProps) {
  const { takePhoto, recordVideo, pickFromLibrary } = useMediaCapture();
  const { colors } = useTheme();

  const atLimit = attachments.length >= maxAttachments;

  const handleCapture = async (mode: 'photo' | 'video' | 'library') => {
    if (atLimit) {
      Alert.alert('Limit Reached', `Maximum ${maxAttachments} attachments allowed.`);
      return;
    }

    let asset: MediaAsset | null = null;
    if (mode === 'photo') asset = await takePhoto();
    else if (mode === 'video') asset = await recordVideo();
    else asset = await pickFromLibrary();

    if (asset) onAdd(asset);
  };

  return (
    <View style={styles.container}>
      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => handleCapture('photo')}
          style={[styles.actionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
        >
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>Photo</Text>
        </Pressable>
        <Pressable
          onPress={() => handleCapture('video')}
          style={[styles.actionBtn, { backgroundColor: colors.warningLight, borderColor: colors.border }]}
        >
          <Text style={styles.actionIcon}>🎥</Text>
          <Text style={[styles.actionLabel, { color: colors.warning }]}>Video (10s)</Text>
        </Pressable>
        <Pressable
          onPress={() => handleCapture('library')}
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={styles.actionIcon}>📎</Text>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Library</Text>
        </Pressable>
      </View>

      {/* Thumbnail previews */}
      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRow}
        >
          {attachments.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.thumbnailWrapper}>
              <Pressable onPress={() => onPreview?.(index)}>
                <Image source={{ uri: asset.uri }} style={styles.thumbnail} />
                {asset.type === 'video' && (
                  <View style={styles.videoOverlay}>
                    <Text style={styles.videoIcon}>▶</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => onRemove(index)}
                style={[styles.removeBtn, { backgroundColor: colors.error }]}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Text style={[styles.countText, { color: colors.textTertiary }]}>
            {attachments.length}/{maxAttachments}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  actionIcon: { fontSize: 16 },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  thumbnailRow: { gap: 8, paddingVertical: 4, alignItems: 'center' },
  thumbnailWrapper: { position: 'relative' },
  thumbnail: { width: 72, height: 72, borderRadius: 8 },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: { color: '#fff', fontSize: 20 },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  countText: { fontSize: 12, fontWeight: '500', alignSelf: 'center' },
});
