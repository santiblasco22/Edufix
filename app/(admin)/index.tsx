import React, { useEffect, useState, useCallback } from 'react';
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
import { StatsCard } from '@/components/StatsCard';
import { IncidentCard } from '@/components/IncidentCard';

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  cancelled: number;
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, in_progress: 0, resolved: 0, cancelled: 0 });
  const [recent, setRecent] = useState<Incident[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const { data: incidents } = await supabase
      .from('incidents')
      .select('*')
      .eq('institution_id', profile?.institution_id)
      .order('created_at', { ascending: false });

    if (incidents) {
      setStats({
        total: incidents.length,
        pending: incidents.filter(i => i.status === 'pending').length,
        in_progress: incidents.filter(i => i.status === 'in_progress').length,
        resolved: incidents.filter(i => i.status === 'resolved').length,
        cancelled: incidents.filter(i => i.status === 'cancelled').length,
      });
      setRecent(incidents.slice(0, 5) as Incident[]);
    }
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
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Bienvenido,</Text>
            <Text style={styles.name}>{profile?.full_name ?? 'Administrador'}</Text>
            <View style={styles.institutionRow}>
              <MaterialIcons name="business" size={12} color={COLORS.textMuted} />
              <Text style={styles.institution}>{profile?.institution?.name ?? 'UADE'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <MaterialIcons name="logout" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.roleBadge}>
          <MaterialIcons name="admin-panel-settings" size={14} color={COLORS.primary} />
          <Text style={styles.roleBadgeText}>Panel de Administrador</Text>
        </View>

        <Text style={styles.sectionTitle}>Resumen general</Text>
        <View style={styles.statsGrid}>
          <StatsCard label="Total" value={stats.total} icon="list-alt" color="#3B82F6" bgColor="#EFF6FF" />
          <StatsCard label="Pendientes" value={stats.pending} icon="schedule" color="#F59E0B" bgColor="#FFFBEB" />
        </View>
        <View style={styles.statsGrid}>
          <StatsCard label="En progreso" value={stats.in_progress} icon="sync" color="#3B82F6" bgColor="#DBEAFE" />
          <StatsCard label="Resueltos" value={stats.resolved} icon="check-circle" color="#10B981" bgColor="#ECFDF5" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Incidentes recientes</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/incidents')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="inbox" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No hay incidentes reportados</Text>
          </View>
        ) : (
          recent.map(incident => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onPress={() => router.push(`/(admin)/incident/${incident.id}`)}
              showAssignee
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: { fontSize: 14, color: COLORS.textMuted },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  institutionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  institution: { fontSize: 12, color: COLORS.textMuted },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 14,
  },
  seeAll: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
