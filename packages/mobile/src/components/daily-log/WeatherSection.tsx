import { View, Text, StyleSheet } from 'react-native';
import type { WeatherEntry } from '@/api/endpoints/daily-logs';

interface WeatherSectionProps { weather: WeatherEntry; }

function ConfBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.85 ? '#16a34a' : confidence >= 0.6 ? '#ca8a04' : '#dc2626';
  const bg = confidence >= 0.85 ? '#dcfce7' : confidence >= 0.6 ? '#fef3c7' : '#fee2e2';
  return (
    <View style={[styles.confBadge, { backgroundColor: bg }]}>
      <Text style={[styles.confText, { color }]}>{pct}%</Text>
    </View>
  );
}

export function WeatherSection({ weather }: WeatherSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Conditions</Text>
        {weather.aiGenerated && weather.aiConfidence != null && <ConfBadge confidence={weather.aiConfidence} />}
      </View>
      <Text style={styles.value}>{weather.conditions.join(', ')}</Text>
      <View style={styles.metricsRow}>
        {weather.tempHigh != null && (
          <View style={styles.metric}><Text style={styles.metricLabel}>High</Text><Text style={styles.metricValue}>{weather.tempHigh}°F</Text></View>
        )}
        {weather.tempLow != null && (
          <View style={styles.metric}><Text style={styles.metricLabel}>Low</Text><Text style={styles.metricValue}>{weather.tempLow}°F</Text></View>
        )}
        {weather.humidity != null && (
          <View style={styles.metric}><Text style={styles.metricLabel}>Humidity</Text><Text style={styles.metricValue}>{weather.humidity}%</Text></View>
        )}
        {weather.windSpeed != null && (
          <View style={styles.metric}><Text style={styles.metricLabel}>Wind</Text><Text style={styles.metricValue}>{weather.windSpeed} mph</Text></View>
        )}
      </View>
      {weather.delayMinutes > 0 && <Text style={styles.delay}>Weather delay: {weather.delayMinutes} min</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  value: { fontSize: 16, color: '#0f172a' },
  metricsRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  metric: {},
  metricLabel: { fontSize: 12, color: '#64748b' },
  metricValue: { fontSize: 16, fontWeight: '500', color: '#0f172a' },
  delay: { fontSize: 14, color: '#ea580c', marginTop: 4 },
  confBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  confText: { fontSize: 12, fontWeight: '600' },
});
