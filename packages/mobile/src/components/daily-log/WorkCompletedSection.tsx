import { View, Text, StyleSheet } from 'react-native';
import type { WorkCompletedEntry } from '@/api/endpoints/daily-logs';

export function WorkCompletedSection({ entries }: { entries: WorkCompletedEntry[] }) {
  return (
    <View style={styles.container}>
      {entries.map((e) => (
        <View key={e.id} style={styles.entry}>
          <View style={styles.row}>
            <Text style={styles.location}>{e.location}</Text>
            {e.aiGenerated && e.aiConfidence != null && (
              <Text style={{ fontSize: 12, fontWeight: '600', color: e.aiConfidence >= 0.85 ? '#16a34a' : '#ca8a04' }}>
                {Math.round(e.aiConfidence * 100)}%
              </Text>
            )}
          </View>
          <Text style={styles.desc}>{e.description}</Text>
          <View style={styles.metaRow}>
            {e.percentComplete != null && <Text style={styles.meta}>{e.percentComplete}% complete</Text>}
            {e.quantity != null && e.unit && <Text style={styles.meta}>{e.quantity} {e.unit}</Text>}
            {e.csiCode && <Text style={styles.meta}>CSI {e.csiCode}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  entry: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  location: { fontSize: 16, fontWeight: '500', color: '#0f172a', flex: 1 },
  desc: { fontSize: 14, color: '#0f172a', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  meta: { fontSize: 13, color: '#64748b' },
});
