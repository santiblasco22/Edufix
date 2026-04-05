import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Incident } from '@/types';
import { COLORS, CATEGORY_LABELS, PRIORITY_LABELS } from '@/constants';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';

export default function StaffIncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  useEffect(() => { loadIncident(); }, [id]);

  async function loadIncident() {
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();
    if (data) {
      setIncident(data as Incident);
      setResolutionNotes(data.resolution_notes ?? '');
    }
    setLoading(false);
  }

  async function assignToMe() {
    setUpdating(true);
    await supabase.from('incidents').update({
      assigned_to: profile?.user_id,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    await loadIncident();
    setUpdating(false);
  }

  async function resolveIncident() {
    if (!resolutionNotes.trim()) {
      Alert.alert('Error', 'Por favor ingresá notas de resolución.');
      return;
    }
    setUpdating(true);
    await supabase.from('incidents').update({
      status: 'resolved',
      resolution_notes: resolutionNotes.trim(),
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    setUpdating(false);
    router.back();
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.loader}>
        <Text>Incidente no encontrado</Text>
      </View>
    );
  }

  const isAssignedToMe = incident.assigned_to === profile?.user_id;
  const isPending = incident.status === 'pending';
  const isInProgress = incident.status === 'in_progress';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Detalle del incidente</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.incidentTitle}>{incident.title}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Descripción</Text>
          <Text style={styles.description}>{incident.description}</Text>
        </View>

        {incident.photo_url && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Foto adjunta</Text>
            <Image source={{ uri: incident.photo_url }} style={styles.photo} resizeMode="cover" />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Información</Text>
          <InfoRow icon="category" label="Categoría" value={CATEGORY_LABELS[incident.category]} />
          <InfoRow icon="flag" label="Prioridad" value={PRIORITY_LABELS[incident.priority]} />
          <InfoRow icon="place" label="Ubicación" value={incident.location || 'Sin especificar'} />
          <InfoRow icon="person" label="Reportado por" value={incident.reporter?.full_name ?? '—'} />
          <InfoRow icon="access-time" label="Fecha" value={new Date(incident.created_at).toLocaleString('es-AR')} />
        </View>

        {isPending && (
          <View style={styles.actionCard}>
            <Text style={styles.sectionLabel}>Acción disponible</Text>
            <Text style={styles.actionDesc}>Este incidente no tiene agente asignado. Podés tomarlo para comenzar a trabajar en él.</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, updating && { opacity: 0.7 }]}
              onPress={assignToMe}
              disabled={updating}
              activeOpacity={0.8}
            >
              {updating
                ? <ActivityIndicator color={COLORS.white} />
                : <>
                  <MaterialIcons name="engineering" size={18} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Tomarme el incidente</Text>
                </>
              }
            </TouchableOpacity>
          </View>
        )}

        {isInProgress && isAssignedToMe && (
          <View style={styles.actionCard}>
            <Text style={styles.sectionLabel}>Resolver incidente</Text>
            {!showResolveForm ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowResolveForm(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="check-circle" size={18} color={COLORS.white} />
                <Text style={styles.primaryBtnText}>Marcar como resuelto</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.resolveForm}>
                <Text style={styles.resolveLabel}>Notas de resolución</Text>
                <TextInput
                  style={styles.textArea}
                  value={resolutionNotes}
                  onChangeText={setResolutionNotes}
                  placeholder="Describí cómo se resolvió el problema..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.formBtns}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => setShowResolveForm(false)}
                  >
                    <Text style={styles.secondaryBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1 }, updating && { opacity: 0.7 }]}
                    onPress={resolveIncident}
                    disabled={updating}
                  >
                    {updating
                      ? <ActivityIndicator size="small" color={COLORS.white} />
                      : <Text style={styles.primaryBtnText}>Confirmar resolución</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {incident.resolution_notes && (
          <View style={[styles.card, { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.sectionLabel, { color: '#065F46' }]}>Notas de resolución</Text>
            <Text style={styles.description}>{incident.resolution_notes}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <MaterialIcons name={icon} size={16} color={COLORS.textMuted} />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  value: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { flex: 1 },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: COLORS.accentLight,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  incidentTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 28, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  photo: { width: '100%', height: 200, borderRadius: 12 },
  actionDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  resolveForm: { gap: 12 },
  resolveLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  textArea: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    minHeight: 100,
  },
  formBtns: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
});
