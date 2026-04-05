import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ScrollView,
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
  { value: 'cancelled', label: 'Cancelados' },
];

export default function AdminIncidents() {
  const { profile } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filtered, setFiltered] = useState<Incident[]>([]);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function loadIncidents() {
    const { data } = await supabase
      .from('incidents')
      .select('*, reporter:profiles!reported_by(full_name, role), assignee:profiles!assigned_to(full_name)')
      .eq('institution_id', profile?.institution_id)
      .order('created_at', { ascending: false });

    if (data) {
      setIncidents(data as Incident[]);
      applyFilters(data as Incident[], statusFilter, search);
    }
  }

  useFocusEffect(useCallback(() => { loadIncidents(); }, [profile]));

  function applyFilters(data: Incident[], status: IncidentStatus | 'all', query: string) {
    let result = data;
    if (status !== 'all') result = result.filter(i => i.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }

  function onStatusChange(status: IncidentStatus | 'all') {
    setStatusFilter(status);
    applyFilters(incidents, status, search);
  }

  function onSearchChange(text: string) {
    setSearch(text);
    applyFilters(incidents, statusFilter, text);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadIncidents();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header fijo */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Todos los incidentes</Text>
        <Text style={styles.count}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Búsqueda fija */}
      <View style={styles.searchWrapper}>
        <MaterialIcons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder="Buscar por título, descripción..."
          placeholderTextColor={COLORS.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <MaterialIcons name="close" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros fijos */}
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
            onPress={() => onStatusChange(item.value as IncidentStatus | 'all')}
          >
            <Text style={[styles.filterChipText, statusFilter === item.value && styles.filterChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de incidentes — ocupa el espacio restante */}
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="search-off"
            title="Sin resultados"
            subtitle="No hay incidentes que coincidan con los filtros aplicados."
          />
        }
        renderItem={({ item }) => (
          <IncidentCard
            incident={item}
            onPress={() => router.push(`/(admin)/incident/${item.id}`)}
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
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
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
