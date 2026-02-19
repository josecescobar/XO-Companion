import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function ComplianceLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Compliance' }} />
      <Stack.Screen name="add-document" options={{ title: 'Add Document' }} />
      <Stack.Screen name="add-training" options={{ title: 'Add Training Record' }} />
      <Stack.Screen name="incidents/index" options={{ title: 'Incidents' }} />
      <Stack.Screen name="incidents/new" options={{ title: 'Report Incident' }} />
      <Stack.Screen name="training" options={{ title: 'Training Records' }} />
    </Stack>
  );
}
