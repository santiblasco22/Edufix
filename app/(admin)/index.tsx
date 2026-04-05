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
import { COLORS, CATEGORY_LABELS, CATEGORY_ICONS } from '@/constants';
import { IncidentCard } from '@/components/IncidentCard';

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  cancelled: number;
  critical_pending: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, in_progress: 0, resolved: 0, cancelled: 0, critical_pending: 0,
  });
  const [recent, setRecent] = useState<Incident[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryCount[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const { data: incidents } = await supabase
      .from('incidents')
      .select('*')
      .eq('institution_id', profile?.institution_id)
      .order('created_at', { ascending: false });

    if (!incidents) return;

    const pending = incidents.filter(i => i.status === 'pending');
    const in_progress = incidents.filter(i => i.status === 'in_progress');
    const resolved = incidents.filter(i => i.status === 'resolved');
    const cancelled = incidents.filter(i => i.status === 'cancelled');
    const critical_pending = pending.filter(i => i.priority === 'critical' || i.priority === 'high').length;

    setStats({
      total: incidents.length,
      pending: pending.length,
      in_progress: in_progress.length,
      resolved: resolved.length,
      cancelled: cancelled.length,
      critical_pending,
    });

    // Top 3 categorías con más incidentes activos (no cancelados, no resueltos)
    const active = incidents.filter(i => i.status === 'pending' || i.status === 'in_progress');
    const catMap: Record<string, number> = {};
    active.forEach(i => { catMap[i.category] = (catMap[i.category] ?? 0) + 1; });
    const sorted = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));
    setTopCategories(sorted);

    setRecent(incidents.slice(0, 4) as Incident[]);
  }

  useFocusEffect(useCallback(() => { loadData(); }, [profile]));

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const resolutionRate = stats.total > 0
    ? Math.round((stats.resolved / stats.total) * 100)
    : 0;

  const activeTotal = stats.pending + stats.in_progress;

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

        {/* Alerta de críticos */}
        {stats.critical_pending > 0 && (
          <TouchableOpacity
            style={styles.criticalBanner}
            onPress={() => router.push('/(admin)/incidents')}
            activeOpacity={0.85}
          >
            <View style={styles.criticalLeft}>
              <View style={styles.criticalIconWrap}>
                <MaterialIcons name="warning" size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.criticalTitle}>
                  {stats.critical_pending} incidente{stats.critical_pending !== 1 ? 's' : ''} de alta prioridad
                </Text>
                <Text style={styles.criticalSub}>Pendientes · Requieren atención urgente</Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={14} color="#7C3AED" />
          </TouchableOpacity>
        )}

        {/* Stats principales */}
        <Text style={styles.sectionTitle}>Resumen general</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: '#3B82F6' }]}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.warning }]}>
            <Text style={[styles.statValue, { color: '#92400E' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#3B82F6' }]}>
            <Text style={[styles.statValue, { color: '#1E40AF' }]}>{stats.in_progress}</Text>
            <Text style={styles.statLabel}>En progreso</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
            <Text style={[styles.statValue, { color: '#065F46' }]}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resueltos</Text>
          </View>
        </View>

        {/* Tasa de resolución */}
        <View style={styles.resolutionCard}>
          <View style={styles.resolutionLeft}>
            <Text style={styles.resolutionLabel}>Tasa de resolución</Text>
            <Text style={styles.resolutionSub}>
              {stats.resolved} de {stats.total} incidentes resueltos
            </Text>
          </View>
          <View style={styles.resolutionRight}>
            <Text style={styles.resolutionRate}>{resolutionRate}%</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${resolutionRate}%` as any }]} />
        </View>

        {/* Desglose por categoría */}
        {topCategories.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Categorías activas</Text>
            <View style={styles.categoriesCard}>
              {topCategories.map(({ category, count }, index) => (
                <View key={category} style={[styles.categoryRow, index < topCategories.length - 1 && styles.categoryRowBorder]}>
                  <View style={styles.categoryLeft}>
                    <View style={styles.categoryIcon}>
                      <MaterialIcons
                        name={CATEGORY_ICONS[category] as keyof typeof MaterialIcons.glyphMap}
                        size={16}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.categoryName}>{CATEGORY_LABELS[category]}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <View style={[styles.categoryBar, { width: Math.max(20, (count / activeTotal) * 100) }]} />
                    <Text style={styles.categoryCount}>{count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Accesos rápidos */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Acciones rápidas</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(admin)/incidents')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#EFF6FF' }]}>
              <MaterialIcons name="list-alt" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.quickLabel}>Ver todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(admin)/incidents')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: COLORS.warningLight }]}>
              <MaterialIcons name="schedule" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.quickLabel}>Pendientes</Text>
            {stats.pending > 0 && (
              <View style={styles.quickBadge}>
                <Text style={styles.quickBadgeText}>{stats.pending}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(admin)/users')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#F0FDF4' }]}>
              <MaterialIcons name="people" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.quickLabel}>Usuarios</Text>
          </TouchableOpacity>
        </View>

        {/* Incidentes recientes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recientes</Text>
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
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.accentLight, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, marginBottom: 20,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  criticalBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5F3FF', borderRadius: 14, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: '#DDD6FE',
  },
  criticalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  criticalIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center',
  },
  criticalTitle: { fontSize: 14, fontWeight: '700', color: '#5B21B6' },
  criticalSub: { fontSize: 12, color: '#7C3AED', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 24, marginBottom: 14,
  },
  seeAll: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.border, borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 3 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
  resolutionCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0,
  },
  resolutionLeft: { flex: 1 },
  resolutionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  resolutionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  resolutionRight: {},
  resolutionRate: { fontSize: 28, fontWeight: '800', color: COLORS.success },
  progressBarBg: {
    height: 8, backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    overflow: 'hidden', marginBottom: 4,
    borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.border,
  },
  progressBarFill: {
    height: '100%', backgroundColor: COLORS.success,
    borderRadius: 8,
  },
  categoriesCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
  },
  categoryRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center', alignItems: 'center',
  },
  categoryName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryBar: {
    height: 6, backgroundColor: COLORS.primary,
    borderRadius: 3, minWidth: 20, maxWidth: 100,
  },
  categoryCount: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, minWidth: 20, textAlign: 'right' },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  quickBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 16, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border,
    position: 'relative',
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  quickLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  quickBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: COLORS.danger, borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5,
  },
  quickBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  emptyBox: {
    alignItems: 'center', paddingVertical: 40, gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
