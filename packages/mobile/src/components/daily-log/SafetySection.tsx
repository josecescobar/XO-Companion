import { View, Text } from 'react-native';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import { Badge } from '../ui/Badge';
import type { SafetyEntry } from '@/api/endpoints/daily-logs';

interface SafetySectionProps {
  safety: SafetyEntry;
}

export function SafetySection({ safety }: SafetySectionProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-field-sm font-medium text-field-muted">
          Safety Summary
        </Text>
        {safety.aiGenerated && safety.aiConfidence != null && (
          <ConfidenceBadge confidence={safety.aiConfidence} />
        )}
      </View>

      {safety.oshaRecordable && (
        <Badge label="OSHA Recordable" variant="error" />
      )}

      <View className="flex-row gap-6">
        <View>
          <Text className="text-field-sm text-field-muted">Near Misses</Text>
          <Text className="text-field-lg font-bold text-field-text">
            {safety.nearMisses}
          </Text>
        </View>
        <View>
          <Text className="text-field-sm text-field-muted">First Aid</Text>
          <Text className="text-field-lg font-bold text-field-text">
            {safety.firstAidCases}
          </Text>
        </View>
      </View>

      {safety.toolboxTalks.length > 0 && (
        <View>
          <Text className="mb-1 text-field-sm font-medium text-field-muted">
            Toolbox Talks
          </Text>
          {safety.toolboxTalks.map((talk, i) => (
            <Text key={i} className="text-field-base text-field-text">
              • {talk}
            </Text>
          ))}
        </View>
      )}

      {safety.incidents.length > 0 && (
        <View>
          <Text className="mb-1 text-field-sm font-medium text-safety-red">
            Incidents
          </Text>
          {safety.incidents.map((inc, i) => (
            <Text key={i} className="text-field-base text-field-text">
              • {inc}
            </Text>
          ))}
        </View>
      )}

      {safety.notes && (
        <Text className="text-field-sm text-field-muted">{safety.notes}</Text>
      )}
    </View>
  );
}
