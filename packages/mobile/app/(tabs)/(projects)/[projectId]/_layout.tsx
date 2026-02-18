import { Stack } from 'expo-router';

export default function ProjectDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#ffffff',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Project' }} />
      <Stack.Screen name="daily-logs" options={{ headerShown: false }} />
    </Stack>
  );
}
