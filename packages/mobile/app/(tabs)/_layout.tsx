import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { SyncStatusBar } from '@/components/common/SyncStatusBar';
import { shadows } from '@/theme/tokens';

export default function TabsLayout() {
  const { colors } = useTheme();
  useNotifications();
  useOfflineSync();

  return (
    <View style={{ flex: 1 }}>
      <SyncStatusBar />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 0,
            height: 60,
            paddingBottom: 6,
            ...shadows.sm,
          },
          tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(projects)"
          options={{
            title: 'Projects',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'folder' : 'folder-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(record)"
          options={{
            title: 'Record',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'mic' : 'mic-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(reviews)"
          options={{
            title: 'Reviews',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(account)"
          options={{
            title: 'Account',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
            ),
          }}
        />
        {/* Compliance accessible from Home screen, not a separate tab */}
        <Tabs.Screen
          name="(compliance)"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
    </View>
  );
}
