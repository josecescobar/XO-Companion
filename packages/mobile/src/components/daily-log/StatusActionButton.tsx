import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { useLogStatusTransition } from '@/hooks/mutations/useLogStatusTransition';
import type { StatusAction } from '@/lib/permissions';

interface StatusActionButtonProps {
  action: StatusAction;
  projectId: string;
  logId: string;
}

export function StatusActionButton({
  action,
  projectId,
  logId,
}: StatusActionButtonProps) {
  const { mutate, isPending } = useLogStatusTransition(action.key);

  const handlePress = () => {
    Alert.alert(action.confirmTitle, action.confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action.confirmButtonText,
        onPress: () => {
          mutate(
            { projectId, logId },
            {
              onSuccess: () => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              },
              onError: (err) => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
                Alert.alert(
                  'Error',
                  err instanceof Error
                    ? err.message
                    : 'Something went wrong. Please try again.',
                );
              },
            },
          );
        },
      },
    ]);
  };

  return (
    <Button
      title={action.label}
      variant={action.variant}
      size="lg"
      onPress={handlePress}
      loading={isPending}
    />
  );
}
