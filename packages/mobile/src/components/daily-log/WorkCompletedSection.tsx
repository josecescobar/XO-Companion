import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { WorkCompletedEntry } from '@/api/endpoints/daily-logs';

interface WorkCompletedSectionProps {
  entries: WorkCompletedEntry[];
  editable?: boolean;
  onEdit?: (entry: WorkCompletedEntry) => void;
  onDelete?: (entryId: string) => void;
  onAdd?: () => void;
}

export function WorkCompletedSection({ entries, editable, onEdit, onDelete, onAdd }: WorkCompletedSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {entries.map((e) => (
        <View key={e.id} style={[styles.entry, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.location, { color: colors.text }]}>{e.location}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {e.aiGenerated && e.aiConfidence != null && (
                <Text style={{ fontSize: 12, fontWeight: '600', color: e.aiConfidence >= 0.85 ? colors.success : colors.warning }}>
                  {Math.round(e.aiConfidence * 100)}%
                </Text>
              )}
              {editable && (
                <View style={styles.editActions}>
                  <Pressable onPress={() => onEdit?.(e)} hitSlop={8}>
                    <Text style={{ color: colors.primary, fontSize: 16 }}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => onDelete?.(e.id)} hitSlop={8}>
                    <Text style={{ color: colors.error, fontSize: 16 }}>🗑️</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.desc, { color: colors.text }]}>{e.description}</Text>
          <View style={styles.metaRow}>
            {e.percentComplete != null && <Text style={[styles.meta, { color: colors.textSecondary }]}>{e.percentComplete}% complete</Text>}
            {e.quantity != null && e.unit && <Text style={[styles.meta, { color: colors.textSecondary }]}>{e.quantity} {e.unit}</Text>}
            {e.csiCode && <Text style={[styles.meta, { color: colors.textSecondary }]}>CSI {e.csiCode}</Text>}
          </View>
        </View>
      ))}
      {editable && (
        <Pressable onPress={onAdd} style={[styles.addBtn, { borderColor: colors.primary }]}>
          <Text style={[styles.addBtnText, { color: colors.primary }]}>+ Add Entry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  entry: { borderRadius: 8, borderWidth: 1, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  location: { fontSize: 16, fontWeight: '500', flex: 1 },
  desc: { fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  meta: { fontSize: 13 },
  editActions: { flexDirection: 'row', gap: 12 },
  addBtn: { borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  addBtnText: { fontSize: 14, fontWeight: '600' },
});
