import { View, Text, StyleSheet } from 'react-native';
import { CollapsibleSection } from '@/components/daily-log/CollapsibleSection';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';

interface ExtractedDataSectionsProps {
  extractedData: Record<string, unknown>;
}

const sectionLabels: Record<string, string> = {
  weather: 'Weather',
  workforce: 'Workforce',
  equipment: 'Equipment',
  workCompleted: 'Work Completed',
  materials: 'Materials',
  safety: 'Safety',
  delays: 'Delays',
};

const skipFields = new Set([
  'id',
  'dailyLogId',
  'createdAt',
  'updatedAt',
  'aiGenerated',
  'aiConfidence',
  'voiceNoteId',
]);

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ') || '—';
  return String(value);
}

function EntryCard({ entry }: { entry: Record<string, unknown> }) {
  const confidence =
    typeof entry.aiConfidence === 'number' ? entry.aiConfidence : null;

  return (
    <View style={styles.entryCard}>
      {confidence !== null && (
        <View style={styles.confidenceRow}>
          <ConfidenceBadge confidence={confidence} />
        </View>
      )}
      {Object.entries(entry)
        .filter(([key]) => !skipFields.has(key))
        .map(([key, val]) => (
          <View key={key} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{formatKey(key)}</Text>
            <Text style={styles.fieldValue}>{formatValue(val)}</Text>
          </View>
        ))}
    </View>
  );
}

export function ExtractedDataSections({ extractedData }: ExtractedDataSectionsProps) {
  return (
    <View>
      {Object.entries(sectionLabels).map(([key, label]) => {
        const data = extractedData[key];
        if (!data) return null;

        const items = Array.isArray(data) ? data : [data];
        if (items.length === 0) return null;

        return (
          <CollapsibleSection
            key={key}
            title={label}
            count={Array.isArray(data) ? data.length : undefined}
            defaultOpen
          >
            {items.map((item, idx) => (
              <EntryCard
                key={typeof item === 'object' && item?.id ? String(item.id) : idx}
                entry={item as Record<string, unknown>}
              />
            ))}
          </CollapsibleSection>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  entryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
  },
});
