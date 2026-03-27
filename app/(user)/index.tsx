import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
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

export default function UserHome() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadIncidents() {
    const { data } = await supabase
      .from('incidents')
      .select('*, assignee:profiles!assigned_to(full_name)')
      .eq('reported_by', profile?.user_id)
      .order('created_at', { ascending: false });

    if (data) setIncidents(data as Incident[]);
  }

  useFocusEffect(useCallback(() => { loadIncidents(); }, [profile]));

  async function onRefresh() {
    setRefreshing(true);
    await loadIncidents();
    setRefreshing(false);
  }

  const activeCount = incidents.filter(i => i.status === 'pending' || i.status === 'in_progress').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={incidents}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.greeting}>Hola,</Text>
                <Text style={styles.name}>{profile?.full_name ?? 'Usuario'}</Text>
              </View>
              <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
                <MaterialIcons name="logout" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{activeCount}</Text>
                <Text style={styles.summaryLabel}>Activos</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[styles.summaryValue, { color: '#065F46' }]}>{resolvedCount}</Text>
                <Text style={styles.summaryLabel}>Resueltos</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#F1F5F9', borderColor: COLORS.border }]}>
                <Text style={[styles.summaryValue, { color: COLORS.textSecondary }]}>{incidents.length}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.reportCTA}
              onPress={() => router.push('/(user)/report')}
              activeOpacity={0.85}
            >
              <View style={styles.reportCTALeft}>
                <View style={styles.reportCTAIcon}>
                  <MaterialIcons name="add" size={22} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.reportCTATitle}>Reportar nuevo incidente</Text>
                  <Text style={styles.reportCTASub}>Foto, descripción y prioridad</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={14} color={COLORS.white} />
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Mis reportes</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="Sin reportes aún"
            subtitle="Cuando reportes un incidente, aparecerá aquí para que puedas hacer seguimiento."
          />
        }
        renderItem={({ item }) => (
          <IncidentCard
            incident={item}
            onPress={() => router.push(`/(user)/incident/${item.id}`)}
            showAssignee
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 20,
  },
  greeting: { fontSize: 14, color: COLORS.textMuted },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
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
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  reportCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  reportCTALeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  reportCTAIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportCTATitle: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  reportCTASub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
});
