import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Notification } from '@/types';
import { COLORS } from '@/constants';
import { EmptyState } from '@/components/EmptyState';

function getNotifStyle(message: string) {
  if (message.toLowerCase().includes('resuelto')) {
    return { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', icon: 'check-circle' as const };
  }
  return { color: '#1E40AF', bg: '#DBEAFE', border: '#BFDBFE', icon: 'engineering' as const };
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

export default function UserNotifications() {
  const { profile } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadNotifications() {
    if (!profile?.user_id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data as Notification[]);
  }

  async function markAllRead() {
    if (!profile?.user_id) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.user_id)
      .eq('read', false);
  }

  useFocusEffect(useCallback(() => {
    loadNotifications();
    markAllRead();
  }, [profile]));

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount} nueva{unreadCount !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-none"
            title="Sin notificaciones"
            subtitle="Acá vas a ver cuando tu reporte sea atendido o resuelto."
          />
        }
        renderItem={({ item }) => {
          const style = getNotifStyle(item.message);
          return (
            <TouchableOpacity
              style={[styles.item, !item.read && styles.itemUnread]}
              onPress={() => router.push(`/(user)/incident/${item.incident_id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: style.bg, borderColor: style.border }]}>
                <MaterialIcons name={style.icon} size={20} color={style.color} />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemMessage}>{item.message}</Text>
                <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  unreadBadge: {
    backgroundColor: COLORS.primary, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  unreadBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  itemUnread: { borderColor: COLORS.accent, backgroundColor: '#F8FBFF' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemMessage: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20, fontWeight: '500' },
  itemTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.accent, flexShrink: 0,
  },
});
