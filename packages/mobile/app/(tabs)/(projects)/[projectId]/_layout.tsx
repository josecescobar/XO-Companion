import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function ProjectDetailLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Project' }} />
      <Stack.Screen name="daily-logs" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="team" options={{ title: 'Team' }} />
    </Stack>
  );
}
