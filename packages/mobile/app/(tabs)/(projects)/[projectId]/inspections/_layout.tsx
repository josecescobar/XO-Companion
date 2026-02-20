import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function InspectionsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Inspections' }} />
      <Stack.Screen name="new" options={{ title: 'New Inspection' }} />
      <Stack.Screen name="[inspectionId]" options={{ title: 'Inspection Results' }} />
    </Stack>
  );
}
