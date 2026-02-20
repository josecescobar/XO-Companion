import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useComplianceDashboard } from '@/hooks/queries/useCompliance';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { ComplianceDocument } from '@/api/endpoints/compliance';

function SummaryCard({ expired, expiringSoon, upcoming, colors }: {
  expired: number;
  expiringSoon: number;
  upcoming: number;
  colors: any;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface }, shadows.md]}>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, { color: expired > 0 ? colors.error : colors.success }]}>
          {expired}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expired</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, { color: expiringSoon > 0 ? colors.warning : colors.success }]}>
          {expiringSoon}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expiring Soon</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, { color: colors.text }]}>{upcoming}</Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Upcoming</Text>
      </View>
    </View>
  );
}

function DocumentRow({ doc, alertType, daysUntilExpiration, colors }: {
  doc: ComplianceDocument;
  alertType?: 'EXPIRED' | 'EXPIRING_SOON';
  daysUntilExpiration?: number;
  colors: any;
}) {
  const typeLabel = doc.documentType.replace(/_/g, ' ');
  const isExpired = alertType === 'EXPIRED';

  return (
    <View style={[styles.docRow, { backgroundColor: colors.surface }, shadows.md]}>
      <View style={styles.docHeader}>
        <Text style={[styles.docName, { color: colors.text }]} numberOfLines={1}>{doc.name}</Text>
        {daysUntilExpiration != null && (
          <View style={[styles.daysBadge, { backgroundColor: isExpired ? colors.errorLight : colors.warningLight }]}>
            <Text style={[styles.daysText, { color: isExpired ? colors.error : colors.warning }]}>
              {isExpired ? `${Math.abs(daysUntilExpiration)}d overdue` : `${daysUntilExpiration}d left`}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.docMeta}>
        <Text style={[styles.docType, { color: colors.textSecondary }]}>{typeLabel}</Text>
        {doc.expirationDate && (
          <Text style={[styles.docDate, { color: colors.textSecondary }]}>
            Exp: {format(new Date(doc.expirationDate), 'MMM d, yyyy')}
          </Text>
        )}
      </View>
      {doc.licenseNumber && (
        <Text style={[styles.docLicense, { color: colors.textTertiary }]}>#{doc.licenseNumber}</Text>
      )}
    </View>
  );
}

function ComplianceContent() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useComplianceDashboard();
  const { colors } = useTheme();

  if (isLoading) return <LoadingState message="Loading compliance..." />;
  if (error || !data) return <ErrorState message="Failed to load compliance data" onRetry={refetch} />;

  const { summary, expired, expiringSoon, upcomingRenewals } = data;
  const totalDocs = expired.length + expiringSoon.length + upcomingRenewals.length;

  type ListItem =
    | { type: 'summary' }
    | { type: 'actions' }
    | { type: 'section'; title: string; count: number }
    | { type: 'expired'; doc: ComplianceDocument; daysUntilExpiration?: number }
    | { type: 'expiring'; doc: ComplianceDocument & { daysUntilExpiration: number } }
    | { type: 'upcoming'; doc: ComplianceDocument }
    | { type: 'empty'; message: string };

  const items: ListItem[] = [{ type: 'summary' }, { type: 'actions' }];

  if (expired.length > 0) {
    items.push({ type: 'section', title: 'Expired', count: expired.length });
    expired.forEach((doc) => items.push({ type: 'expired', doc }));
  }

  if (expiringSoon.length > 0) {
    items.push({ type: 'section', title: 'Expiring Soon', count: expiringSoon.length });
    expiringSoon.forEach((doc) => items.push({ type: 'expiring', doc }));
  }

  if (upcomingRenewals.length > 0) {
    items.push({ type: 'section', title: 'Upcoming Renewals', count: upcomingRenewals.length });
    upcomingRenewals.forEach((doc) => items.push({ type: 'upcoming', doc }));
  }

  if (totalDocs === 0) {
    items.push({ type: 'empty', message: 'No compliance documents tracked yet.' });
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(_, idx) => String(idx)}
      renderItem={({ item }) => {
        switch (item.type) {
          case 'summary':
            return (
              <SummaryCard
                expired={summary.expired}
                expiringSoon={summary.expiringSoon}
                upcoming={summary.upcomingRenewals}
                colors={colors}
              />
            );
          case 'actions':
            return (
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => router.push('/(tabs)/(compliance)/add-document')}
                  style={[styles.actionCard, { backgroundColor: colors.primaryLight }, shadows.sm]}
                >
                  <Ionicons name="document-outline" size={24} color={colors.primary} />
                  <Text style={[styles.actionLabel, { color: colors.primary }]}>+ Document</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(tabs)/(compliance)/training')}
                  style={[styles.actionCard, { backgroundColor: colors.successLight }, shadows.sm]}
                >
                  <Ionicons name="school-outline" size={24} color={colors.success} />
                  <Text style={[styles.actionLabel, { color: colors.success }]}>Training</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(tabs)/(compliance)/incidents')}
                  style={[styles.actionCard, { backgroundColor: colors.errorLight }, shadows.sm]}
                >
                  <Ionicons name="shield-checkmark-outline" size={24} color={colors.error} />
                  <Text style={[styles.actionLabel, { color: colors.error }]}>Incidents</Text>
                </Pressable>
              </View>
            );
          case 'section':
            return (
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{item.count}</Text>
              </View>
            );
          case 'expired':
            return <DocumentRow doc={item.doc} alertType="EXPIRED" colors={colors} />;
          case 'expiring':
            return (
              <DocumentRow
                doc={item.doc}
                alertType="EXPIRING_SOON"
                daysUntilExpiration={item.doc.daysUntilExpiration}
                colors={colors}
              />
            );
          case 'upcoming':
            return <DocumentRow doc={item.doc} colors={colors} />;
          case 'empty':
            return <EmptyState title="No Documents" message={item.message} icon="document-outline" />;
          default:
            return null;
        }
      }}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    />
  );
}

export default function ComplianceScreen() {
  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Compliance' }} />
      <ComplianceContent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  divider: { width: 1, height: 36 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionCount: { fontSize: 14, fontWeight: '600' },
  docRow: { borderRadius: 12, padding: 12, marginBottom: 8 },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  daysBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  daysText: { fontSize: 11, fontWeight: '700' },
  docMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  docType: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  docDate: { fontSize: 12 },
  docLicense: { fontSize: 11, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, minHeight: 48 },
  actionLabel: { fontSize: 12, fontWeight: '700' },
});
