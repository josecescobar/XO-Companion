import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function CommunicationsLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.header }, headerTintColor: colors.headerText }}>
      <Stack.Screen name="index" options={{ title: 'Communications' }} />
      <Stack.Screen name="new" options={{ title: 'New Communication' }} />
      <Stack.Screen name="[commId]" options={{ title: 'Draft Review' }} />
    </Stack>
  );
}
