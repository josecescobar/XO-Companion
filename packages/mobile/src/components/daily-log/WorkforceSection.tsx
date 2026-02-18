import { View, Text, StyleSheet } from 'react-native';
import type { WorkforceEntry } from '@/api/endpoints/daily-logs';

interface WorkforceSectionProps { entries: WorkforceEntry[]; }

export function WorkforceSection({ entries }: WorkforceSectionProps) {
  const totalWorkers = entries.reduce((sum, e) => sum + e.workerCount, 0);
  const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked * e.workerCount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.summary}>Total: {totalWorkers} workers, {totalHours} man-hours</Text>
      {entries.map((entry) => {
        const pct = entry.aiConfidence != null ? Math.round(entry.aiConfidence * 100) : null;
        const confColor = entry.aiConfidence != null
          ? entry.aiConfidence >= 0.85 ? '#16a34a' : entry.aiConfidence >= 0.6 ? '#ca8a04' : '#dc2626'
          : null;
        return (
          <View key={entry.id} style={styles.entry}>
            <View style={styles.row}>
              <Text style={styles.trade}>{entry.trade}</Text>
              {entry.aiGenerated && pct != null && <Text style={[styles.conf, { color: confColor! }]}>{pct}%</Text>}
            </View>
            <Text style={styles.company}>{entry.company}</Text>
            <Text style={styles.details}>
              {entry.workerCount} workers · {entry.hoursWorked}h{entry.overtimeHours > 0 ? ` (+${entry.overtimeHours}h OT)` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  summary: { fontSize: 14, color: '#64748b' },
  entry: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trade: { fontSize: 16, fontWeight: '500', color: '#0f172a' },
  conf: { fontSize: 12, fontWeight: '600' },
  company: { fontSize: 14, color: '#64748b', marginTop: 2 },
  details: { fontSize: 14, color: '#64748b', marginTop: 4 },
});
