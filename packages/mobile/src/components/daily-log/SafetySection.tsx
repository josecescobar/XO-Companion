import { View, Text, StyleSheet } from 'react-native';
import type { SafetyEntry } from '@/api/endpoints/daily-logs';

export function SafetySection({ safety }: { safety: SafetyEntry }) {
  return (
    <View style={styles.container}>
      {safety.oshaRecordable && (
        <View style={styles.oshaBadge}><Text style={styles.oshaText}>OSHA Recordable</Text></View>
      )}
      <View style={styles.statsRow}>
        <View><Text style={styles.statLabel}>Near Misses</Text><Text style={styles.statValue}>{safety.nearMisses}</Text></View>
        <View><Text style={styles.statLabel}>First Aid</Text><Text style={styles.statValue}>{safety.firstAidCases}</Text></View>
      </View>
      {safety.toolboxTalks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Toolbox Talks</Text>
          {safety.toolboxTalks.map((t, i) => <Text key={i} style={styles.listItem}>• {t}</Text>)}
        </View>
      )}
      {safety.incidents.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: '#dc2626' }]}>Incidents</Text>
          {safety.incidents.map((inc, i) => <Text key={i} style={styles.listItem}>• {inc}</Text>)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  oshaBadge: { backgroundColor: '#fee2e2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  oshaText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  statsRow: { flexDirection: 'row', gap: 32 },
  statLabel: { fontSize: 12, color: '#64748b' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  section: { marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: '#64748b', marginBottom: 4 },
  listItem: { fontSize: 16, color: '#0f172a' },
});
