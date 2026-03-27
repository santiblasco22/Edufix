import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';

function RootLayoutNav() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inRoleGroup = ['(admin)', '(staff)', '(user)'].includes(segments[0] as string);

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && profile && inAuthGroup) {
      redirectByRole(profile.role);
    } else if (session && profile && !inRoleGroup && !inAuthGroup) {
      redirectByRole(profile.role);
    }
  }, [session, profile, loading, segments]);

  function redirectByRole(role: string) {
    if (role === 'admin') router.replace('/(admin)/');
    else if (role === 'staff') router.replace('/(staff)/');
    else router.replace('/(user)/');
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen name="(user)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
