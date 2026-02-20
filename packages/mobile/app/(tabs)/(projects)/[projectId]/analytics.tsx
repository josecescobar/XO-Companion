import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useProjectDashboard } from '@/hooks/queries/useAnalytics';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
import type { RiskAlert } from '@/api/endpoints/analytics';

function severityColor(severity: string, colors: any) {
  switch (severity) {
    case 'CRITICAL': return { bg: colors.errorLight, text: colors.error };
    case 'HIGH': return { bg: colors.errorLight, text: colors.error };
    case 'MEDIUM': return { bg: colors.warningLight, text: colors.warning };
    default: return { bg: colors.primaryLight, text: colors.primary };
  }
}

function trendLabel(trend: string) {
  switch (trend) {
    case 'INCREASING': case 'GROWING': case 'IMPROVING': return '↑ ' + trend.toLowerCase();
    case 'DECREASING': case 'DECLINING': return '↓ ' + trend.toLowerCase();
    default: return '→ stable';
  }
}

function riskColor(level: string, colors: any) {
  switch (level) {
    case 'CRITICAL': return colors.error;
    case 'HIGH': return colors.orange;
    case 'MEDIUM': return colors.warning;
    default: return colors.success;
  }
}

function StatBox({ label, value, color, colors }: { label: string; value: string | number; color?: string; colors: any }) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surface }, shadows.md]}>
      <Text style={[styles.statBoxValue, { color: color ?? colors.text }]}>{value}</Text>
      <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function AlertRow({ alert, colors }: { alert: RiskAlert; colors: any }) {
  const sc = severityColor(alert.severity, colors);
  return (
    <View style={[styles.alertRow, { backgroundColor: colors.surface }, shadows.md]}>
      <View style={styles.alertHeader}>
        <View style={[styles.severityBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.severityText, { color: sc.text }]}>{alert.severity}</Text>
        </View>
        <Text style={[styles.alertType, { color: colors.textSecondary }]}>
          {alert.alertType.replace(/_/g, ' ')}
        </Text>
      </View>
      <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
      <Text style={[styles.alertDesc, { color: colors.textSecondary }]} numberOfLines={2}>
        {alert.description}
      </Text>
    </View>
  );
}

export default function AnalyticsDashboardScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { data, isLoading, error, refetch, isRefetching } = useProjectDashboard(projectId);
  const { colors } = useTheme();

  if (isLoading) return <LoadingState message="Loading analytics..." />;
  if (error || !data) return <ErrorState message="Failed to load analytics" onRetry={refetch} />;

  const { summary, safetyScore, delayAnalysis, workforceTrend, scheduleRisk, activeAlerts } = data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Analytics' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Summary Stats */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
        <View style={styles.statsGrid}>
          <StatBox label="Daily Logs" value={summary.totalLogs} colors={colors} />
          <StatBox label="Work Hours" value={summary.totalWorkHours} colors={colors} />
          <StatBox label="Delay Hours" value={summary.totalDelayHours} color={summary.totalDelayHours > 0 ? colors.warning : undefined} colors={colors} />
          <StatBox label="Active Days" value={summary.activeDays} colors={colors} />
          <StatBox label="Avg Workforce" value={summary.avgDailyWorkforce} colors={colors} />
        </View>

        {/* Safety Score */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
          <View style={styles.safetyRow}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreValue, { color: safetyScore.score >= 60 ? colors.success : colors.error }]}>
                {safetyScore.score}
              </Text>
              <Text style={[styles.scoreMax, { color: colors.textSecondary }]}>/100</Text>
            </View>
            <View style={styles.safetyDetails}>
              <Text style={[styles.detailRow, { color: colors.text }]}>
                TRIR: {safetyScore.trir.toFixed(2)}
              </Text>
              <Text style={[styles.detailRow, { color: colors.text }]}>
                Days since recordable: {safetyScore.daysSinceLastRecordable ?? 'N/A'}
              </Text>
              <Text style={[styles.detailRow, { color: colors.text }]}>
                Toolbox compliance: {Math.round(safetyScore.toolboxTalkCompliance * 100)}%
              </Text>
              <Text style={[styles.trendText, { color: colors.textSecondary }]}>
                {trendLabel(safetyScore.trend)}
              </Text>
            </View>
          </View>
        </View>

        {/* Delay Analysis */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Delays</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.cardStat, { color: colors.text }]}>{delayAnalysis.totalHours}h total</Text>
            <Text style={[styles.trendText, { color: colors.textSecondary }]}>{trendLabel(delayAnalysis.trend)}</Text>
          </View>
          {delayAnalysis.byCategory.length > 0 ? (
            delayAnalysis.byCategory.map((cat) => (
              <View key={cat.cause} style={styles.categoryRow}>
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {cat.cause.replace(/_/g, ' ')}
                </Text>
                <Text style={[styles.categoryValue, { color: colors.textSecondary }]}>
                  {cat.totalHours}h
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noData, { color: colors.textTertiary }]}>No delays recorded</Text>
          )}
        </View>

        {/* Workforce Trend */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Workforce</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.cardStat, { color: colors.text }]}>{workforceTrend.currentAvg} avg/day</Text>
              <Text style={[styles.subStat, { color: colors.textSecondary }]}>
                Previous: {workforceTrend.previousAvg} avg/day
              </Text>
            </View>
            <Text style={[styles.trendText, { color: workforceTrend.trend === 'DECLINING' ? colors.warning : colors.textSecondary }]}>
              {trendLabel(workforceTrend.trend)}
            </Text>
          </View>
          {workforceTrend.byTrade.length > 0 && (
            <View style={styles.tradeList}>
              {workforceTrend.byTrade.slice(0, 5).map((t) => (
                <View key={t.trade} style={styles.categoryRow}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{t.trade}</Text>
                  <Text style={[styles.categoryValue, { color: colors.textSecondary }]}>{t.avgCount} avg</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Schedule Risk */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule Risk</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.cardStat, { color: colors.text }]}>{scheduleRisk.totalDelayHours}h cumulative delay</Text>
              <Text style={[styles.subStat, { color: colors.textSecondary }]}>{scheduleRisk.delayPercentage}% of elapsed time</Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: riskColor(scheduleRisk.riskLevel, colors) + '20' }]}>
              <Text style={[styles.riskText, { color: riskColor(scheduleRisk.riskLevel, colors) }]}>
                {scheduleRisk.riskLevel}
              </Text>
            </View>
          </View>
          {scheduleRisk.projectedImpact && (
            <Text style={[styles.impactText, { color: colors.textSecondary }]}>{scheduleRisk.projectedImpact}</Text>
          )}
        </View>

        {/* Active Alerts */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Active Alerts ({activeAlerts.length})
        </Text>
        {activeAlerts.length > 0 ? (
          activeAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} colors={colors} />)
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
            <Text style={[styles.noData, { color: colors.textTertiary }]}>No active alerts</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    borderRadius: 12,
    padding: 12,
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
  },
  statBoxValue: { fontSize: 20, fontWeight: '800' },
  statBoxLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  card: { borderRadius: 14, padding: 14, marginBottom: 4 },
  safetyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreCircle: { alignItems: 'center' },
  scoreValue: { fontSize: 32, fontWeight: '800' },
  scoreMax: { fontSize: 14 },
  safetyDetails: { flex: 1, gap: 2 },
  detailRow: { fontSize: 14 },
  trendText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardStat: { fontSize: 16, fontWeight: '700' },
  subStat: { fontSize: 13, marginTop: 2 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, marginTop: 4 },
  categoryName: { fontSize: 14, textTransform: 'capitalize' },
  categoryValue: { fontSize: 14, fontWeight: '600' },
  tradeList: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f020', paddingTop: 4 },
  riskBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  riskText: { fontSize: 12, fontWeight: '700' },
  impactText: { fontSize: 13, marginTop: 8 },
  noData: { fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  alertRow: { borderRadius: 12, padding: 12, marginBottom: 8 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  severityBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  severityText: { fontSize: 10, fontWeight: '700' },
  alertType: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  alertTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  alertDesc: { fontSize: 13 },
});
