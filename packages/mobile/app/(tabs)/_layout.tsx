import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { SyncStatusBar } from '@/components/common/SyncStatusBar';

export default function TabsLayout() {
  const { colors } = useTheme();
  useNotifications();

  return (
    <View style={{ flex: 1 }}>
    <SyncStatusBar />
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="(projects)"
        options={{
          title: 'Projects',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📁</Text>,
        }}
      />
      <Tabs.Screen
        name="(record)"
        options={{
          title: 'Record',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🎙️</Text>,
        }}
      />
      <Tabs.Screen
        name="(reviews)"
        options={{
          title: 'Reviews',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text>,
        }}
      />
      <Tabs.Screen
        name="(account)"
        options={{
          title: 'Account',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
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
