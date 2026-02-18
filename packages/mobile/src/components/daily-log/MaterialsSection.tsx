import { View, Text, StyleSheet } from 'react-native';
import type { MaterialEntry } from '@/api/endpoints/daily-logs';

export function MaterialsSection({ entries }: { entries: MaterialEntry[] }) {
  return (
    <View style={styles.container}>
      {entries.map((e) => (
        <View key={e.id} style={styles.entry}>
          <View style={styles.row}>
            <Text style={styles.name}>{e.material}</Text>
            {e.aiGenerated && e.aiConfidence != null && (
              <Text style={{ fontSize: 12, fontWeight: '600', color: e.aiConfidence >= 0.85 ? '#16a34a' : '#ca8a04' }}>
                {Math.round(e.aiConfidence * 100)}%
              </Text>
            )}
          </View>
          <Text style={styles.details}>{e.quantity} {e.unit} · {e.condition.replace(/_/g, ' ')}</Text>
          {e.supplier && <Text style={styles.supplier}>Supplier: {e.supplier}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  entry: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '500', color: '#0f172a' },
  details: { fontSize: 14, color: '#64748b', marginTop: 4 },
  supplier: { fontSize: 13, color: '#64748b', marginTop: 2 },
});
