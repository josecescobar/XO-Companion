import { View, Text, StyleSheet } from 'react-native';
import type { DelayEntry } from '@/api/endpoints/daily-logs';

export function DelaysSection({ entries }: { entries: DelayEntry[] }) {
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  return (
    <View style={styles.container}>
      <Text style={styles.total}>Total delay: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</Text>
      {entries.map((e) => (
        <View key={e.id} style={styles.entry}>
          <View style={styles.row}>
            <View style={styles.causeBadge}><Text style={styles.causeText}>{e.cause.replace(/_/g, ' ')}</Text></View>
            {e.aiGenerated && e.aiConfidence != null && (
              <Text style={{ fontSize: 12, fontWeight: '600', color: e.aiConfidence >= 0.85 ? '#16a34a' : '#ca8a04' }}>
                {Math.round(e.aiConfidence * 100)}%
              </Text>
            )}
          </View>
          <Text style={styles.desc}>{e.description}</Text>
          <Text style={styles.meta}>{e.durationMinutes} min{e.impactedTrades.length > 0 ? ` · Impacted: ${e.impactedTrades.join(', ')}` : ''}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  total: { fontSize: 14, color: '#64748b' },
  entry: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  causeBadge: { backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  causeText: { fontSize: 11, fontWeight: '600', color: '#ca8a04', textTransform: 'capitalize' },
  desc: { fontSize: 14, color: '#0f172a', marginTop: 4 },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
});
