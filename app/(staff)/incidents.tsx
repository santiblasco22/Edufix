import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Incident, IncidentStatus } from '@/types';
import { COLORS } from '@/constants';
import { IncidentCard } from '@/components/IncidentCard';
import { EmptyState } from '@/components/EmptyState';

const FILTER_OPTIONS: { value: IncidentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'resolved', label: 'Resueltos' },
];

export default function StaffIncidents() {
  const { profile } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filtered, setFiltered] = useState<Incident[]>([]);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('pending');
  const [refreshing, setRefreshing] = useState(false);

  async function loadIncidents() {
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .eq('institution_id', profile?.institution_id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (data) {
      setIncidents(data as Incident[]);
      applyFilter(data as Incident[], statusFilter);
    }
  }

  useFocusEffect(useCallback(() => { loadIncidents(); }, [profile]));

  function applyFilter(data: Incident[], status: IncidentStatus | 'all') {
    setFiltered(status === 'all' ? data : data.filter(i => i.status === status));
  }

  function onFilterChange(status: IncidentStatus | 'all') {
    setStatusFilter(status);
    applyFilter(incidents, status);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadIncidents();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Incidentes</Text>
        <Text style={styles.count}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={styles.filterScroll}
      >
        {FILTER_OPTIONS.map(item => (
          <TouchableOpacity
            key={item.value}
            style={[styles.filterChip, statusFilter === item.value && styles.filterChipActive]}
            onPress={() => onFilterChange(item.value as IncidentStatus | 'all')}
          >
            <Text style={[styles.filterChipText, statusFilter === item.value && styles.filterChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="check-circle-outline"
            title="Sin incidentes"
            subtitle="No hay incidentes con este estado actualmente."
          />
        }
        renderItem={({ item }) => (
          <IncidentCard
            incident={item}
            onPress={() => router.push(`/(staff)/incident/${item.id}`)}
            showAssignee
          />
        )}
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
  filterScroll: { flexGrow: 0 },
  filterList: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
});
