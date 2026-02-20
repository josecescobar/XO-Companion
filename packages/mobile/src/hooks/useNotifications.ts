import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { type EventSubscription } from 'expo-modules-core';
import { useRouter } from 'expo-router';
import { api } from '@/api/client';
import { setPushToken } from '@/lib/secure-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (err) {
    console.error('Failed to get push token:', err);
    return null;
  }
}

async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await setPushToken(token);
    await api<{ success: boolean }>('/notifications/register', {
      method: 'POST',
      body: {
        token,
        platform: Platform.OS,
      },
    });
  } catch (err) {
    console.error('Failed to register push token with backend:', err);
  }
}

export function useNotifications() {
  const router = useRouter();
  const notificationListener = useRef<EventSubscription>(null);
  const responseListener = useRef<EventSubscription>(null);

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;

      if (data?.screen) {
        switch (data.screen) {
          case 'voice-review':
            if (data.projectId && data.logId) {
              router.push(`/(tabs)/(projects)/${data.projectId}/daily-logs/${data.logId}` as any);
            }
            break;
          case 'inspection-result':
            if (data.projectId && data.inspectionId) {
              router.push(`/(tabs)/(projects)/${data.projectId}/inspections/${data.inspectionId}` as any);
            }
            break;
          case 'communication-draft':
            if (data.projectId && data.commId) {
              router.push(`/(tabs)/(projects)/${data.projectId}/communications/${data.commId}` as any);
            }
            break;
          case 'compliance':
            router.push('/(tabs)/(compliance)' as any);
            break;
          case 'tasks':
            if (data.projectId) {
              router.push(`/(tabs)/(projects)/${data.projectId}/tasks` as any);
            }
            break;
          case 'reviews':
            router.push('/(tabs)/(reviews)' as any);
            break;
          default:
            break;
        }
      }
    },
    [router],
  );

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        registerTokenWithBackend(token);
      }
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('xo-companion', {
        name: 'XO Companion',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
    }

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [handleNotificationResponse]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        registerForPushNotificationsAsync().then((token) => {
          if (token) registerTokenWithBackend(token);
        });
      }
    });
    return () => subscription.remove();
  }, []);
}
