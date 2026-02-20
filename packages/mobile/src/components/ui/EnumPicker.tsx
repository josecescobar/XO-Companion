import { Modal, View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface EnumPickerProps {
  visible: boolean;
  title: string;
  options: { label: string; value: string }[];
  selected: string | string[];
  onSelect: (value: string | string[]) => void;
  onClose: () => void;
  multiSelect?: boolean;
}

export function EnumPicker({ visible, title, options, selected, onSelect, onClose, multiSelect }: EnumPickerProps) {
  const { colors } = useTheme();
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected]);

  const toggle = (value: string) => {
    if (multiSelect) {
      const next = new Set(selectedSet);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      onSelect(Array.from(next));
    } else {
      onSelect(value);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => toggle(item.value)}
                style={[
                  styles.option,
                  { borderColor: colors.border },
                  selectedSet.has(item.value) && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text style={[styles.optionText, { color: selectedSet.has(item.value) ? colors.primary : colors.text }]}>
                  {item.label}
                </Text>
                {selectedSet.has(item.value) && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            )}
          />
          {multiSelect && (
            <Pressable style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 16, paddingHorizontal: 4, minHeight: 52 },
  optionText: { fontSize: 16, fontWeight: '500' },
  doneBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  doneBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
