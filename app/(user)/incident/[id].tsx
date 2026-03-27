import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Incident } from '@/types';
import { COLORS, CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/constants';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';

const TIMELINE_STEPS = [
  { status: 'pending', label: 'Reportado', icon: 'assignment' as const, desc: 'Tu reporte fue recibido' },
  { status: 'in_progress', label: 'En proceso', icon: 'engineering' as const, desc: 'Personal asignado trabajando' },
  { status: 'resolved', label: 'Resuelto', icon: 'check-circle' as const, desc: 'Incidente atendido y cerrado' },
];

export default function UserIncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadIncident(); }, [id]);

  async function loadIncident() {
    const { data } = await supabase
      .from('incidents')
      .select('*, reporter:profiles!reported_by(*), assignee:profiles!assigned_to(*)')
      .eq('id', id)
      .single();
    setIncident(data as Incident);
    setLoading(false);
  }

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!incident) {
    return <View style={styles.loader}><Text>Incidente no encontrado</Text></View>;
  }

  const currentStepIndex = incident.status === 'cancelled'
    ? -1
    : TIMELINE_STEPS.findIndex(s => s.status === incident.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Mi reporte</Text>
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

        {incident.status !== 'cancelled' ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Estado del proceso</Text>
            {TIMELINE_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isPending = index > currentStepIndex;

              return (
                <View key={step.status} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotDone,
                      isCurrent && styles.timelineDotCurrent,
                      isPending && styles.timelineDotPending,
                    ]}>
                      <MaterialIcons
                        name={isCompleted ? 'check' : step.icon}
                        size={14}
                        color={isPending ? COLORS.textMuted : COLORS.white}
                      />
                    </View>
                    {index < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, isCompleted && styles.timelineLineDone]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      isCurrent && styles.timelineLabelCurrent,
                      isPending && styles.timelineLabelPending,
                    ]}>
                      {step.label}
                    </Text>
                    <Text style={styles.timelineDesc}>{step.desc}</Text>
                    {isCurrent && (
                      <View style={styles.timelineCurrentBadge}>
                        <Text style={styles.timelineCurrentText}>Estado actual</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.card, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
            <View style={styles.cancelledInfo}>
              <MaterialIcons name="cancel" size={28} color={COLORS.danger} />
              <View>
                <Text style={[styles.sectionLabel, { color: COLORS.danger, marginBottom: 4 }]}>Incidente cancelado</Text>
                <Text style={styles.cancelledText}>Este reporte fue descartado por el equipo de gestión.</Text>
              </View>
            </View>
          </View>
        )}

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
          <Text style={styles.sectionLabel}>Detalles</Text>
          <InfoRow icon="category" label="Categoría" value={CATEGORY_LABELS[incident.category]} />
          <InfoRow icon="flag" label="Prioridad" value={PRIORITY_LABELS[incident.priority]} />
          <InfoRow icon="place" label="Ubicación" value={incident.location || 'Sin especificar'} />
          {incident.assignee && (
            <InfoRow icon="engineering" label="Asignado a" value={incident.assignee.full_name} />
          )}
          <InfoRow icon="access-time" label="Reportado el" value={new Date(incident.created_at).toLocaleString('es-AR')} />
          {incident.resolved_at && (
            <InfoRow icon="check-circle" label="Resuelto el" value={new Date(incident.resolved_at).toLocaleString('es-AR')} />
          )}
        </View>

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
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  navTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { flex: 1 },
  card: {
    margin: 16, marginBottom: 0,
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: COLORS.border,
  },
  incidentTitle: {
    fontSize: 20, fontWeight: '700', color: COLORS.textPrimary,
    lineHeight: 28, marginBottom: 12,
  },
  badgeRow: { flexDirection: 'row', gap: 8 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
  },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  photo: { width: '100%', height: 200, borderRadius: 12 },
  timelineItem: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.textMuted,
  },
  timelineDotDone: { backgroundColor: COLORS.success },
  timelineDotCurrent: { backgroundColor: COLORS.primary },
  timelineDotPending: { backgroundColor: COLORS.border, borderWidth: 2, borderColor: COLORS.border },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  timelineLineDone: { backgroundColor: COLORS.success },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 3 },
  timelineLabelCurrent: { color: COLORS.primary },
  timelineLabelPending: { color: COLORS.textMuted },
  timelineDesc: { fontSize: 12, color: COLORS.textMuted },
  timelineCurrentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 100, marginTop: 6,
  },
  timelineCurrentText: { fontSize: 11, fontWeight: '700', color: COLORS.accent },
  cancelledInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  cancelledText: { fontSize: 13, color: '#991B1B', lineHeight: 20 },
});
