import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function ReviewsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Reviews' }} />
    </Stack>
  );
}
