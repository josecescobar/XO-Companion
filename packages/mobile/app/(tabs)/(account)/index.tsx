import { View, Text, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/mutations/useLogout';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending } = useLogout();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Account' }} />
      <View className="flex-1 px-4 pt-4">
        <Card className="mb-4">
          <View className="items-center py-4">
            <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-brand-100">
              <Text className="text-3xl font-bold text-brand-500">
                {user?.firstName?.charAt(0) ?? '?'}
                {user?.lastName?.charAt(0) ?? ''}
              </Text>
            </View>
            <Text className="text-field-xl font-bold text-field-text">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="mt-1 text-field-base text-field-muted">
              {user?.email}
            </Text>
            {user?.role && (
              <View className="mt-2">
                <Badge label={formatRole(user.role)} variant="info" />
              </View>
            )}
          </View>
        </Card>

        <Card className="mb-4">
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-field-base text-field-muted">User ID</Text>
              <Text className="text-field-sm font-mono text-field-text">
                {user?.id?.slice(0, 8)}...
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-field-base text-field-muted">
                Organization
              </Text>
              <Text className="text-field-sm font-mono text-field-text">
                {user?.organizationId?.slice(0, 8)}...
              </Text>
            </View>
          </View>
        </Card>

        <View className="mt-auto pb-8">
          <Button
            title="Log Out"
            variant="danger"
            size="lg"
            onPress={handleLogout}
            loading={isPending}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}
