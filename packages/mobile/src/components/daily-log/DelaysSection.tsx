import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { DelayEntry } from '@/api/endpoints/daily-logs';

interface DelaySectionProps {
  entries: DelayEntry[];
  editable?: boolean;
  onEdit?: (entry: DelayEntry) => void;
  onDelete?: (entryId: string) => void;
  onAdd?: () => void;
}

export function DelaysSection({ entries, editable, onEdit, onDelete, onAdd }: DelaySectionProps) {
  const { colors } = useTheme();
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  return (
    <View style={styles.container}>
      <Text style={[styles.total, { color: colors.textSecondary }]}>Total delay: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</Text>
      {entries.map((e) => (
        <View key={e.id} style={[styles.entry, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.causeBadge, { backgroundColor: colors.warningLight }]}><Text style={[styles.causeText, { color: colors.warning }]}>{e.cause.replace(/_/g, ' ')}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {e.aiGenerated && e.aiConfidence != null && (
                <Text style={{ fontSize: 12, fontWeight: '600', color: e.aiConfidence >= 0.85 ? colors.success : colors.warning }}>
                  {Math.round(e.aiConfidence * 100)}%
                </Text>
              )}
              {editable && (
                <View style={styles.editActions}>
                  <Pressable onPress={() => onEdit?.(e)} hitSlop={8}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => onDelete?.(e.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.desc, { color: colors.text }]}>{e.description}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{e.durationMinutes} min{e.impactedTrades.length > 0 ? ` · Impacted: ${e.impactedTrades.join(', ')}` : ''}</Text>
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
  total: { fontSize: 14 },
  entry: { borderRadius: 8, borderWidth: 1, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  causeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  causeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  desc: { fontSize: 14, marginTop: 4 },
  meta: { fontSize: 13, marginTop: 4 },
  editActions: { flexDirection: 'row', gap: 12 },
  addBtn: { borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  addBtnText: { fontSize: 14, fontWeight: '600' },
});
