import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function LogDetailLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
      }}
    />
  );
}
