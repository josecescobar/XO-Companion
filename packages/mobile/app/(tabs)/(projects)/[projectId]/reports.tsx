import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack } from 'expo-router';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { useWeeklyReport } from '@/hooks/queries/useReports';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';

function getMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function formatWeekOf(monday: Date): string {
  return format(monday, 'yyyy-MM-dd');
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  return `${format(monday, 'MMM d')} – ${format(sunday, 'MMM d, yyyy')}`;
}

export default function ReportsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { colors } = useTheme();

  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const weekOf = formatWeekOf(currentMonday);

  const { data: report, isFetching, refetch } = useWeeklyReport(projectId, weekOf);

  const prevWeek = useCallback(() => {
    setCurrentMonday((m) => subDays(m, 7));
  }, []);

  const nextWeek = useCallback(() => {
    setCurrentMonday((m) => addDays(m, 7));
  }, []);

  const handleCopy = async () => {
    if (!report?.narrative) return;
    await Clipboard.setStringAsync(report.narrative);
  };

  const handleShare = async () => {
    if (!report?.narrative) return;
    try {
      await Share.share({ message: report.narrative });
    } catch {
      // cancelled
    }
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Weekly Report' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Week Picker */}
        <View style={[styles.weekPicker, { backgroundColor: colors.surface }, shadows.md]}>
          <Pressable onPress={prevWeek} style={styles.weekArrow}>
            <Text style={[styles.weekArrowText, { color: colors.primary }]}>‹</Text>
          </Pressable>
          <Text style={[styles.weekRange, { color: colors.text }]}>{formatWeekRange(currentMonday)}</Text>
          <Pressable onPress={nextWeek} style={styles.weekArrow}>
            <Text style={[styles.weekArrowText, { color: colors.primary }]}>›</Text>
          </Pressable>
        </View>

        {/* Generate Button */}
        <Button
          title={isFetching ? 'Generating Report...' : 'Generate Report'}
          onPress={() => refetch()}
          loading={isFetching}
          size="lg"
        />

        {/* Report Content */}
        {report && (
          <>
            {/* Narrative */}
            <View style={[styles.narrativeCard, { backgroundColor: colors.surface }, shadows.md]}>
              <Text style={[styles.narrativeTitle, { color: colors.text }]}>Weekly Progress Report</Text>
              <Text style={[styles.narrativeText, { color: colors.text }]}>{report.narrative}</Text>
            </View>

            {/* Structured Data Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {report.structured.totalLaborHours}
                </Text>
                <Text style={[styles.statLabel, { color: colors.primary }]}>Labor Hours</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
                <Text style={[styles.statNumber, { color: colors.warning }]}>
                  {report.structured.totalOvertimeHours}
                </Text>
                <Text style={[styles.statLabel, { color: colors.warning }]}>OT Hours</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.statNumber, { color: colors.success }]}>
                  {report.structured.daysWithLogs}
                </Text>
                <Text style={[styles.statLabel, { color: colors.success }]}>Days Logged</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.errorLight }]}>
                <Text style={[styles.statNumber, { color: colors.error }]}>
                  {report.structured.delayMinutes}
                </Text>
                <Text style={[styles.statLabel, { color: colors.error }]}>Delay Min</Text>
              </View>
            </View>

            {/* Trade Breakdown */}
            {report.structured.tradeBreakdown.length > 0 && (
              <View style={[styles.dataCard, { backgroundColor: colors.surface }, shadows.md]}>
                <Text style={[styles.dataCardTitle, { color: colors.text }]}>Workforce by Trade</Text>
                {report.structured.tradeBreakdown.map((t, i) => (
                  <View key={i} style={styles.dataRow}>
                    <Text style={[styles.dataRowLabel, { color: colors.text }]}>{t.trade}</Text>
                    <Text style={[styles.dataRowValue, { color: colors.textSecondary }]}>
                      {t.workers} workers · {t.hours} hrs
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Delay Breakdown */}
            {report.structured.delayBreakdown.length > 0 && (
              <View style={[styles.dataCard, { backgroundColor: colors.surface }, shadows.md]}>
                <Text style={[styles.dataCardTitle, { color: colors.text }]}>Delays by Cause</Text>
                {report.structured.delayBreakdown.map((d, i) => (
                  <View key={i} style={styles.dataRow}>
                    <Text style={[styles.dataRowLabel, { color: colors.text }]}>
                      {d.cause.replace(/_/g, ' ')}
                    </Text>
                    <Text style={[styles.dataRowValue, { color: colors.error }]}>{d.minutes} min</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Safety Summary */}
            <View style={[styles.dataCard, { backgroundColor: colors.surface }, shadows.md]}>
              <Text style={[styles.dataCardTitle, { color: colors.text }]}>Safety Summary</Text>
              <View style={styles.dataRow}>
                <Text style={[styles.dataRowLabel, { color: colors.text }]}>Incidents</Text>
                <Text style={[styles.dataRowValue, { color: report.structured.safetyIncidents > 0 ? colors.error : colors.success }]}>
                  {report.structured.safetyIncidents}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={[styles.dataRowLabel, { color: colors.text }]}>OSHA Recordables</Text>
                <Text style={[styles.dataRowValue, { color: report.structured.oshaRecordables > 0 ? colors.error : colors.success }]}>
                  {report.structured.oshaRecordables}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={[styles.dataRowLabel, { color: colors.text }]}>Toolbox Talks</Text>
                <Text style={[styles.dataRowValue, { color: colors.textSecondary }]}>
                  {report.structured.toolboxTalks.length}
                </Text>
              </View>
            </View>

            {/* Tasks Summary */}
            <View style={[styles.dataCard, { backgroundColor: colors.surface }, shadows.md]}>
              <Text style={[styles.dataCardTitle, { color: colors.text }]}>Tasks This Week</Text>
              <View style={styles.dataRow}>
                <Text style={[styles.dataRowLabel, { color: colors.text }]}>Created</Text>
                <Text style={[styles.dataRowValue, { color: colors.primary }]}>
                  {report.structured.tasksCreated}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={[styles.dataRowLabel, { color: colors.text }]}>Completed</Text>
                <Text style={[styles.dataRowValue, { color: colors.success }]}>
                  {report.structured.tasksCompleted}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Button title="Copy to Clipboard" variant="secondary" onPress={handleCopy} />
              <View style={{ height: 8 }} />
              <Button title="Share" variant="secondary" onPress={handleShare} />
            </View>

            <Text style={[styles.generatedAt, { color: colors.textTertiary }]}>
              Generated {format(new Date(report.generatedAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  // Week picker
  weekPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  weekArrow: { padding: 8, minHeight: 44 },
  weekArrowText: { fontSize: 28, fontWeight: '700' },
  weekRange: { fontSize: 16, fontWeight: '700' },
  // Narrative
  narrativeCard: { borderRadius: 14, padding: 16 },
  narrativeTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  narrativeText: { fontSize: 15, lineHeight: 22 },
  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  // Data cards
  dataCard: { borderRadius: 14, padding: 14 },
  dataCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dataRowLabel: { fontSize: 14, flex: 1 },
  dataRowValue: { fontSize: 14, fontWeight: '700' },
  // Actions
  actions: { marginTop: 4 },
  generatedAt: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
