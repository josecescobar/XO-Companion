import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function DailyLogsLayout() {
  const { colors } = useTheme();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'Daily Logs',
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.headerText,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          headerShown: true,
          title: 'New Daily Log',
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.headerText,
        }}
      />
    </Stack>
  );
}
