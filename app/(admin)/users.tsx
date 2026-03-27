import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, Modal, TextInput, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, createAuthClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Profile, UserRole } from '@/types';
import { COLORS } from '@/constants';

const ROLE_CONFIG: Record<UserRole, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }> = {
  admin: { label: 'Admin', icon: 'admin-panel-settings', color: '#7C3AED', bg: '#F5F3FF' },
  staff: { label: 'Personal', icon: 'engineering', color: '#1E40AF', bg: '#DBEAFE' },
  user: { label: 'Usuario', icon: 'person', color: '#065F46', bg: '#D1FAE5' },
};

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists') || m.includes('email address is already')) {
    return 'Este correo ya está registrado.';
  }
  return msg;
}

function validatePassword(pass: string): string | null {
  if (pass.length < 6) return 'Mínimo 6 caracteres.';
  if (!/[A-Z]/.test(pass)) return 'Debe tener al menos una mayúscula.';
  if (!/[^a-zA-Z0-9]/.test(pass)) return 'Debe tener al menos un carácter especial.';
  return null;
}

export default function AdminUsers() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal crear usuario
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*, institution:institutions(*)')
      .eq('institution_id', currentProfile?.institution_id)
      .order('created_at', { ascending: false });
    if (data) setUsers(data as Profile[]);
  }

  useFocusEffect(useCallback(() => { loadUsers(); }, [currentProfile]));

  async function onRefresh() {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }

  async function handleCreateUser() {
    setCreateError('');
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setCreateError('Completá todos los campos.');
      return;
    }
    const passError = validatePassword(newPassword);
    if (passError) { setCreateError(passError); return; }

    setCreating(true);
    const tempClient = createAuthClient();
    const { data, error } = await tempClient.auth.signUp({
      email: newEmail.trim(),
      password: newPassword,
      options: { data: { full_name: newName.trim(), role: newRole } },
    });

    if (error) {
      setCreating(false);
      setCreateError(friendlyError(error.message));
      return;
    }

    // Si el rol es admin o staff, actualizamos el perfil creado por el trigger
    if (data.user && newRole !== 'user') {
      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', data.user.id);
    }

    setCreating(false);
    closeModal();
    await loadUsers();
  }

  function closeModal() {
    setShowModal(false);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('user');
    setCreateError('');
  }

  async function changeRole(user: Profile, newRole: UserRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    loadUsers();
  }

  function showUserMenu(user: Profile) {
    const roleOptions = (Object.keys(ROLE_CONFIG) as UserRole[]).filter(r => r !== user.role);
    Alert.alert(
      user.full_name,
      `Rol actual: ${ROLE_CONFIG[user.role].label}`,
      [
        ...roleOptions.map(r => ({
          text: `Cambiar a ${ROLE_CONFIG[r].label}`,
          onPress: () => changeRole(user, r),
        })),
        {
          text: 'Eliminar usuario',
          style: 'destructive' as const,
          onPress: () => confirmDelete(user),
        },
        { text: 'Cancelar', style: 'cancel' as const },
      ]
    );
  }

  function confirmDelete(user: Profile) {
    Alert.alert(
      'Eliminar usuario',
      `¿Eliminar a ${user.full_name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('profiles').delete().eq('id', user.id);
            loadUsers();
          },
        },
      ]
    );
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
          <TouchableOpacity onPress={() => showUserMenu(item)} style={styles.moreBtn}>
            <MaterialIcons name="more-vert" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Usuarios</Text>
          <Text style={styles.count}>{users.length} miembro{users.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <MaterialIcons name="person-add" size={20} color={COLORS.white} />
        </TouchableOpacity>
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

      {/* Modal crear usuario */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nuevo usuario</Text>
                <TouchableOpacity onPress={closeModal}>
                  <MaterialIcons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <ModalField label="Nombre completo" value={newName} onChangeText={setNewName} placeholder="Nombre y apellido" autoCapitalize="words" />
                <ModalField label="Correo electrónico" value={newEmail} onChangeText={setNewEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" />
                <ModalField label="Contraseña" value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo 6 caracteres" secureTextEntry />

                <Text style={styles.modalLabel}>Rol</Text>
                <View style={styles.roleRow}>
                  {(Object.keys(ROLE_CONFIG) as UserRole[]).map(r => {
                    const cfg = ROLE_CONFIG[r];
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[styles.roleChip, newRole === r && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                        onPress={() => setNewRole(r)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name={cfg.icon} size={16} color={newRole === r ? cfg.color : COLORS.textMuted} />
                        <Text style={[styles.roleChipText, newRole === r && { color: cfg.color, fontWeight: '700' }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {createError ? (
                  <View style={styles.errorBox}>
                    <MaterialIcons name="error-outline" size={15} color={COLORS.danger} />
                    <Text style={styles.errorText}>{createError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.createBtn, creating && { opacity: 0.7 }]}
                  onPress={handleCreateUser}
                  disabled={creating}
                  activeOpacity={0.8}
                >
                  {creating
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.createBtnText}>Crear usuario</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ModalField({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.modalLabel}>{label}</Text>
      <TextInput
        style={styles.modalInput}
        placeholderTextColor={COLORS.textMuted}
        {...props}
      />
    </View>
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
  count: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    width: 42, height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  meTag: { backgroundColor: COLORS.accentLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  meTagText: { fontSize: 10, fontWeight: '700', color: COLORS.accent },
  userEmail: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8 },
  rolePill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  moreBtn: { padding: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: { justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  modalInput: {
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14,
    height: 48, fontSize: 14, color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  roleChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: { fontSize: 13, color: COLORS.danger, flex: 1 },
  createBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    height: 50, justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
  },
  createBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
