import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { SafetyEntry } from '@/api/endpoints/daily-logs';

interface SafetySectionProps {
  safety: SafetyEntry;
  editable?: boolean;
  onEdit?: () => void;
}

export function SafetySection({ safety, editable, onEdit }: SafetySectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {editable && (
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable onPress={onEdit} style={{ padding: 4 }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Edit</Text>
          </Pressable>
        </View>
      )}
      {safety.oshaRecordable && (
        <View style={[styles.oshaBadge, { backgroundColor: colors.errorLight }]}><Text style={[styles.oshaText, { color: colors.error }]}>OSHA Recordable</Text></View>
      )}
      <View style={styles.statsRow}>
        <View><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Near Misses</Text><Text style={[styles.statValue, { color: colors.text }]}>{safety.nearMisses}</Text></View>
        <View><Text style={[styles.statLabel, { color: colors.textSecondary }]}>First Aid</Text><Text style={[styles.statValue, { color: colors.text }]}>{safety.firstAidCases}</Text></View>
      </View>
      {safety.toolboxTalks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Toolbox Talks</Text>
          {safety.toolboxTalks.map((t, i) => <Text key={i} style={[styles.listItem, { color: colors.text }]}>• {t}</Text>)}
        </View>
      )}
      {safety.incidents.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.error }]}>Incidents</Text>
          {safety.incidents.map((inc, i) => <Text key={i} style={[styles.listItem, { color: colors.text }]}>• {inc}</Text>)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  oshaBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  oshaText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 32 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 22, fontWeight: '700' },
  section: { marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  listItem: { fontSize: 16 },
});
