import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Profile, UserRole } from '@/types';
import { COLORS } from '@/constants';

const ROLE_CONFIG: Record<UserRole, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }> = {
  admin: { label: 'Admin', icon: 'admin-panel-settings', color: '#7C3AED', bg: '#F5F3FF' },
  staff: { label: 'Personal', icon: 'engineering', color: '#1E40AF', bg: '#DBEAFE' },
  user: { label: 'Usuario', icon: 'person', color: '#065F46', bg: '#D1FAE5' },
};

export default function AdminUsers() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*, institution:institutions(*)')
      .eq('institution_id', currentProfile?.institution_id)
      .order('created_at', { ascending: false });
    if (data) setUsers(data as Profile[]);
  }

  useFocusEffect(useCallback(() => { loadUsers(); }, [currentProfile]));

  async function changeRole(user: Profile, newRole: UserRole) {
    Alert.alert(
      'Cambiar rol',
      `¿Cambiar el rol de ${user.full_name} a "${ROLE_CONFIG[newRole].label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
            loadUsers();
          },
        },
      ]
    );
  }

  function showRoleMenu(user: Profile) {
    const options = (Object.keys(ROLE_CONFIG) as UserRole[]).filter(r => r !== user.role);
    Alert.alert(
      `Rol de ${user.full_name}`,
      `Rol actual: ${ROLE_CONFIG[user.role].label}`,
      [
        ...options.map(r => ({
          text: `Cambiar a ${ROLE_CONFIG[r].label}`,
          onPress: () => changeRole(user, r),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ]
    );
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }

  function renderUser({ item }: { item: Profile }) {
    const cfg = ROLE_CONFIG[item.role];
    const isMe = item.user_id === currentProfile?.user_id;

    return (
      <View style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
          <MaterialIcons name={cfg.icon} size={22} color={cfg.color} />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.full_name}</Text>
            {isMe && <View style={styles.meTag}><Text style={styles.meTagText}>Tú</Text></View>}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={[styles.rolePill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.rolePillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        {!isMe && (
          <TouchableOpacity onPress={() => showRoleMenu(item)} style={styles.moreBtn}>
            <MaterialIcons name="more-vert" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Usuarios</Text>
        <Text style={styles.count}>{users.length} miembro{users.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        renderItem={renderUser}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MaterialIcons name="people" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No hay usuarios registrados</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  count: { fontSize: 13, color: COLORS.textMuted },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  meTag: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  meTagText: { fontSize: 10, fontWeight: '700', color: COLORS.accent },
  userEmail: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8 },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  moreBtn: { padding: 4 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
