import { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  Dimensions,
  Share,
  StyleSheet,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '@/hooks/useTheme';
import type { MediaAsset } from '@/hooks/useMediaCapture';

interface MediaPreviewModalProps {
  visible: boolean;
  items: MediaAsset[];
  initialIndex?: number;
  onClose: () => void;
  onDelete?: (index: number) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function MediaPreviewModal({
  visible,
  items,
  initialIndex = 0,
  onClose,
  onDelete,
}: MediaPreviewModalProps) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const current = items[currentIndex];

  const handleShare = async () => {
    if (!current) return;
    try {
      await Share.share({ url: current.uri });
    } catch {
      // user cancelled
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    onDelete(currentIndex);
    if (items.length <= 1) {
      onClose();
    } else if (currentIndex >= items.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!items.length) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Close</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {items.length > 1 ? `${currentIndex + 1} / ${items.length}` : ''}
          </Text>
          <View style={styles.headerActions}>
            <Pressable onPress={handleShare} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Share</Text>
            </Pressable>
            {onDelete && (
              <Pressable onPress={handleDelete} style={styles.headerBtn}>
                <Text style={[styles.headerBtnText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Gallery */}
        <FlatList
          ref={flatListRef}
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(idx);
          }}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              {item.type === 'video' ? (
                <Video
                  source={{ uri: item.uri }}
                  style={styles.media}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  shouldPlay={false}
                />
              ) : (
                <Image
                  source={{ uri: item.uri }}
                  style={styles.media}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
        />

        {/* Metadata */}
        {current && (
          <View style={styles.metaBar}>
            <Text style={styles.metaText}>
              {current.type === 'video' ? 'Video' : 'Photo'} · {current.width}×{current.height}
              {current.fileSize ? ` · ${formatFileSize(current.fileSize)}` : ''}
            </Text>
            <Text style={styles.metaText}>{current.fileName}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerBtn: { padding: 8 },
  headerBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 12 },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 200 },
  metaBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  metaText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
});
