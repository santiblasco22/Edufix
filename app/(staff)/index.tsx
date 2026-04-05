import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Incident } from '@/types';
import { COLORS } from '@/constants';
import { IncidentCard } from '@/components/IncidentCard';
import { EmptyState } from '@/components/EmptyState';

export default function StaffDashboard() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedByMe, setResolvedByMe] = useState(0);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const [myRes, pendingRes, resolvedRes] = await Promise.all([
      supabase
        .from('incidents')
        .select('*')
        .eq('assigned_to', profile?.user_id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false }),
      supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', profile?.institution_id)
        .eq('status', 'pending'),
      supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', profile?.user_id)
        .eq('status', 'resolved'),
    ]);

    if (myRes.data) setMyIncidents(myRes.data as Incident[]);
    setPendingCount(pendingRes.count ?? 0);
    setResolvedByMe(resolvedRes.count ?? 0);
    setTotalAssigned((myRes.data?.length ?? 0) + (resolvedRes.count ?? 0));
  }

  useFocusEffect(useCallback(() => { loadData(); }, [profile]));

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Bienvenido,</Text>
            <Text style={styles.name}>{profile?.full_name ?? 'Personal'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <MaterialIcons name="logout" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.roleBadge}>
          <MaterialIcons name="engineering" size={14} color="#1E40AF" />
          <Text style={styles.roleBadgeText}>Personal de Gestión</Text>
        </View>

        {/* Alerta de pendientes */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => router.push('/(staff)/incidents')}
            activeOpacity={0.85}
          >
            <View style={styles.alertLeft}>
              <View style={styles.alertIconWrap}>
                <MaterialIcons name="notification-important" size={20} color="#92400E" />
              </View>
              <View>
                <Text style={styles.alertTitle}>
                  {pendingCount} incidente{pendingCount !== 1 ? 's' : ''} sin asignar
                </Text>
                <Text style={styles.alertSub}>Requieren atención · Tocá para ver</Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={14} color="#92400E" />
          </TouchableOpacity>
        )}

        {/* Mis estadísticas */}
        <Text style={styles.sectionTitle}>Mis estadísticas</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: '#3B82F6' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
              <MaterialIcons name="sync" size={18} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: '#1E40AF' }]}>{myIncidents.length}</Text>
            <Text style={styles.statLabel}>En progreso</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
              <MaterialIcons name="check-circle" size={18} color={COLORS.success} />
            </View>
            <Text style={[styles.statValue, { color: '#065F46' }]}>{resolvedByMe}</Text>
            <Text style={styles.statLabel}>Resueltos</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.primary }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.accentLight }]}>
              <MaterialIcons name="assignment" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{totalAssigned}</Text>
            <Text style={styles.statLabel}>Total asignados</Text>
          </View>
        </View>

        {/* Mis incidentes activos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis incidentes activos</Text>
          {myIncidents.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{myIncidents.length}</Text>
            </View>
          )}
        </View>

        {myIncidents.length === 0 ? (
          <EmptyState
            icon="assignment-turned-in"
            title="Sin tareas activas"
            subtitle="Todos tus incidentes están al día. Revisá los pendientes para tomar nuevos."
          />
        ) : (
          myIncidents.map(incident => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onPress={() => router.push(`/(staff)/incident/${incident.id}`)}
            />
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingTop: 20, paddingBottom: 8,
  },
  greeting: { fontSize: 14, color: COLORS.textMuted },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#DBEAFE', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, marginBottom: 20,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: '#FDE68A',
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center',
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  alertSub: { fontSize: 12, color: '#B45309', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  countBadge: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    minWidth: 26, height: 26, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border, borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
});
