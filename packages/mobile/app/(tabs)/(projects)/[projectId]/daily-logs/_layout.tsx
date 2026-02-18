import { Stack } from 'expo-router';

export default function DailyLogsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'Daily Logs',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          headerShown: true,
          title: 'New Daily Log',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack>
  );
}
