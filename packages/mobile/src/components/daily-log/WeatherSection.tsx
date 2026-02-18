import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { WeatherEntry } from '@/api/endpoints/daily-logs';

interface WeatherSectionProps {
  weather: WeatherEntry;
  editable?: boolean;
  onEdit?: () => void;
}

function ConfBadge({ confidence }: { confidence: number }) {
  const { colors } = useTheme();
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.85 ? colors.success : confidence >= 0.6 ? colors.warning : colors.error;
  const bg = confidence >= 0.85 ? colors.successLight : confidence >= 0.6 ? colors.warningLight : colors.errorLight;
  return (
    <View style={[styles.confBadge, { backgroundColor: bg }]}>
      <Text style={[styles.confText, { color }]}>{pct}%</Text>
    </View>
  );
}

export function WeatherSection({ weather, editable, onEdit }: WeatherSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Conditions</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {weather.aiGenerated && weather.aiConfidence != null && <ConfBadge confidence={weather.aiConfidence} />}
          {editable && (
            <Pressable onPress={onEdit} style={{ padding: 4 }}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Edit</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{weather.conditions.join(', ')}</Text>
      <View style={styles.metricsRow}>
        {weather.tempHigh != null && (
          <View style={styles.metric}><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>High</Text><Text style={[styles.metricValue, { color: colors.text }]}>{weather.tempHigh}°F</Text></View>
        )}
        {weather.tempLow != null && (
          <View style={styles.metric}><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Low</Text><Text style={[styles.metricValue, { color: colors.text }]}>{weather.tempLow}°F</Text></View>
        )}
        {weather.humidity != null && (
          <View style={styles.metric}><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Humidity</Text><Text style={[styles.metricValue, { color: colors.text }]}>{weather.humidity}%</Text></View>
        )}
        {weather.windSpeed != null && (
          <View style={styles.metric}><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Wind</Text><Text style={[styles.metricValue, { color: colors.text }]}>{weather.windSpeed} mph</Text></View>
        )}
      </View>
      {weather.delayMinutes > 0 && <Text style={[styles.delay, { color: colors.orange }]}>Weather delay: {weather.delayMinutes} min</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '500' },
  value: { fontSize: 16 },
  metricsRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  metric: {},
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 16, fontWeight: '500' },
  delay: { fontSize: 14, marginTop: 4 },
  confBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  confText: { fontSize: 12, fontWeight: '600' },
});
