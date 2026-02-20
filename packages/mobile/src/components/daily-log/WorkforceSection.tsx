import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { WorkforceEntry } from '@/api/endpoints/daily-logs';

interface WorkforceSectionProps {
  entries: WorkforceEntry[];
  editable?: boolean;
  onEdit?: (entry: WorkforceEntry) => void;
  onDelete?: (entryId: string) => void;
  onAdd?: () => void;
}

export function WorkforceSection({ entries, editable, onEdit, onDelete, onAdd }: WorkforceSectionProps) {
  const { colors } = useTheme();
  const totalWorkers = entries.reduce((sum, e) => sum + e.workerCount, 0);
  const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked * e.workerCount, 0);

  return (
    <View style={styles.container}>
      <Text style={[styles.summary, { color: colors.textSecondary }]}>Total: {totalWorkers} workers, {totalHours} man-hours</Text>
      {entries.map((entry) => {
        const pct = entry.aiConfidence != null ? Math.round(entry.aiConfidence * 100) : null;
        const confColor = entry.aiConfidence != null
          ? entry.aiConfidence >= 0.85 ? colors.success : entry.aiConfidence >= 0.6 ? colors.warning : colors.error
          : null;
        return (
          <View key={entry.id} style={[styles.entry, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.trade, { color: colors.text }]}>{entry.trade}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {entry.aiGenerated && pct != null && <Text style={[styles.conf, { color: confColor! }]}>{pct}%</Text>}
                {editable && (
                  <View style={styles.editActions}>
                    <Pressable onPress={() => onEdit?.(entry)} hitSlop={8}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => onDelete?.(entry.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
            <Text style={[styles.company, { color: colors.textSecondary }]}>{entry.company}</Text>
            <Text style={[styles.details, { color: colors.textSecondary }]}>
              {entry.workerCount} workers · {entry.hoursWorked}h{entry.overtimeHours > 0 ? ` (+${entry.overtimeHours}h OT)` : ''}
            </Text>
          </View>
        );
      })}
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
  summary: { fontSize: 14 },
  entry: { borderRadius: 8, borderWidth: 1, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trade: { fontSize: 16, fontWeight: '500' },
  conf: { fontSize: 12, fontWeight: '600' },
  company: { fontSize: 14, marginTop: 2 },
  details: { fontSize: 14, marginTop: 4 },
  editActions: { flexDirection: 'row', gap: 12 },
  addBtn: { borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  addBtnText: { fontSize: 14, fontWeight: '600' },
});
