import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

export default function UserLayout() {
  const { profile } = useAuth();
  const unread = useUnreadNotifications(profile?.user_id);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 82,
          paddingTop: 8,
          paddingBottom: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mis reportes',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inbox" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Reportar',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Avisos',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="incident/[id]" options={{ href: null }} />
    </Tabs>
  );
}
