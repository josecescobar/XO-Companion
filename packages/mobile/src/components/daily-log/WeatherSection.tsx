import { View, Text } from 'react-native';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import type { WeatherEntry } from '@/api/endpoints/daily-logs';

interface WeatherSectionProps {
  weather: WeatherEntry;
}

export function WeatherSection({ weather }: WeatherSectionProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-field-sm font-medium text-field-muted">
          Conditions
        </Text>
        {weather.aiGenerated && weather.aiConfidence != null && (
          <ConfidenceBadge confidence={weather.aiConfidence} />
        )}
      </View>
      <Text className="text-field-base text-field-text">
        {weather.conditions.join(', ')}
      </Text>

      <View className="mt-1 flex-row gap-6">
        {weather.tempHigh != null && (
          <View>
            <Text className="text-field-sm text-field-muted">High</Text>
            <Text className="text-field-base font-medium text-field-text">
              {weather.tempHigh}°F
            </Text>
          </View>
        )}
        {weather.tempLow != null && (
          <View>
            <Text className="text-field-sm text-field-muted">Low</Text>
            <Text className="text-field-base font-medium text-field-text">
              {weather.tempLow}°F
            </Text>
          </View>
        )}
        {weather.humidity != null && (
          <View>
            <Text className="text-field-sm text-field-muted">Humidity</Text>
            <Text className="text-field-base font-medium text-field-text">
              {weather.humidity}%
            </Text>
          </View>
        )}
        {weather.windSpeed != null && (
          <View>
            <Text className="text-field-sm text-field-muted">Wind</Text>
            <Text className="text-field-base font-medium text-field-text">
              {weather.windSpeed} mph
            </Text>
          </View>
        )}
      </View>

      {weather.delayMinutes > 0 && (
        <Text className="mt-1 text-field-sm text-safety-orange">
          Weather delay: {weather.delayMinutes} min
        </Text>
      )}
    </View>
  );
}
