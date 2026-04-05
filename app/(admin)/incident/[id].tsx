import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Incident, IncidentStatus, IncidentCategory, IncidentPriority } from '@/types';
import { COLORS, STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS } from '@/constants';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';

const STATUSES: IncidentStatus[] = ['pending', 'in_progress', 'resolved', 'cancelled'];
const CATEGORIES: IncidentCategory[] = ['infrastructure', 'equipment', 'cleaning', 'electrical', 'plumbing', 'security', 'other'];
const PRIORITIES: IncidentPriority[] = ['low', 'medium', 'high', 'critical'];

export default function AdminIncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  // Cancelar
  const [cancelling, setCancelling] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  // Edición
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCategory, setEditCategory] = useState<IncidentCategory>('other');
  const [editPriority, setEditPriority] = useState<IncidentPriority>('medium');
  const [editStatus, setEditStatus] = useState<IncidentStatus>('pending');

  useEffect(() => { loadIncident(); }, [id]);

  async function loadIncident() {
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();
    setIncident(data as Incident);
    setLoading(false);
  }

  function startEdit() {
    if (!incident) return;
    setEditTitle(incident.title);
    setEditDescription(incident.description);
    setEditLocation(incident.location || '');
    setEditCategory(incident.category);
    setEditPriority(incident.priority);
    setEditStatus(incident.status);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editDescription.trim()) {
      Alert.alert('Error', 'El título y la descripción son obligatorios.');
      return;
    }
    setSaving(true);
    await supabase.from('incidents').update({
      title: editTitle.trim(),
      description: editDescription.trim(),
      location: editLocation.trim() || null,
      category: editCategory,
      priority: editPriority,
      status: editStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    setSaving(false);
    setEditing(false);
    loadIncident();
  }

  async function cancelIncident() {
    if (!cancelNote.trim()) {
      Alert.alert('Error', 'Por favor ingresá un motivo de cancelación.');
      return;
    }
    setCancelling(true);
    await supabase.from('incidents').update({
      status: 'cancelled' as IncidentStatus,
      resolution_notes: cancelNote.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    setCancelling(false);
    router.back();
  }

  function confirmDelete() {
    Alert.alert(
      'Eliminar incidente',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('incidents').delete().eq('id', id);
            router.back();
          },
        },
      ]
    );
  }

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!incident) {
    return <View style={styles.loader}><Text style={styles.errorText}>Incidente no encontrado</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{editing ? 'Editar incidente' : 'Detalle del incidente'}</Text>
        <View style={styles.navActions}>
          {!editing && (
            <>
              <TouchableOpacity onPress={startEdit} style={styles.navBtn}>
                <MaterialIcons name="edit" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={styles.navBtn}>
                <MaterialIcons name="delete" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {editing ? (
          // ── MODO EDICIÓN ──
          <>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Título</Text>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholderTextColor={COLORS.textMuted}
                placeholder="Título del incidente"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Descripción</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Descripción del incidente"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Ubicación</Text>
              <TextInput
                style={styles.editInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Ubicación (opcional)"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Categoría</Text>
              <View style={styles.chipWrap}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, editCategory === c && styles.chipActive]}
                    onPress={() => setEditCategory(c)}
                  >
                    <Text style={[styles.chipText, editCategory === c && styles.chipTextActive]}>
                      {CATEGORY_LABELS[c]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Prioridad</Text>
              <View style={styles.chipWrap}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, editPriority === p && styles.chipActive]}
                    onPress={() => setEditPriority(p)}
                  >
                    <Text style={[styles.chipText, editPriority === p && styles.chipTextActive]}>
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Estado</Text>
              <View style={styles.chipWrap}>
                {STATUSES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, editStatus === s && styles.chipActive]}
                    onPress={() => setEditStatus(s)}
                  >
                    <Text style={[styles.chipText, editStatus === s && styles.chipTextActive]}>
                      {STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.editBtns}>
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.cancelEditBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={saveEdit}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={styles.saveBtnText}>Guardar cambios</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // ── MODO VISTA ──
          <>
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
              <InfoRow icon="place" label="Ubicación" value={incident.location || 'Sin especificar'} />
              <InfoRow icon="person" label="Reportado por" value={incident.reporter?.full_name ?? '—'} />
              <InfoRow icon="engineering" label="Asignado a" value={incident.assignee?.full_name ?? 'Sin asignar'} />
              <InfoRow icon="access-time" label="Fecha de reporte" value={new Date(incident.created_at).toLocaleString('es-AR')} />
              {incident.resolved_at && (
                <InfoRow icon="check-circle" label="Fecha de resolución" value={new Date(incident.resolved_at).toLocaleString('es-AR')} />
              )}
            </View>

            {incident.resolution_notes && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Notas de resolución</Text>
                <Text style={styles.description}>{incident.resolution_notes}</Text>
              </View>
            )}

            {incident.status !== 'cancelled' && incident.status !== 'resolved' && (
              <View style={styles.actionsCard}>
                <Text style={styles.sectionLabel}>Acciones de administrador</Text>
                {!showCancelForm ? (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowCancelForm(true)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="cancel" size={18} color={COLORS.danger} />
                    <Text style={styles.cancelBtnText}>Cancelar incidente</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.cancelForm}>
                    <Text style={styles.cancelFormLabel}>Motivo de cancelación</Text>
                    <TextInput
                      style={styles.textArea}
                      value={cancelNote}
                      onChangeText={setCancelNote}
                      placeholder="Ingresá el motivo..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    <View style={styles.cancelFormBtns}>
                      <TouchableOpacity
                        style={styles.cancelFormSecondary}
                        onPress={() => { setShowCancelForm(false); setCancelNote(''); }}
                      >
                        <Text style={styles.cancelFormSecondaryText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cancelFormPrimary, cancelling && { opacity: 0.7 }]}
                        onPress={cancelIncident}
                        disabled={cancelling}
                      >
                        {cancelling
                          ? <ActivityIndicator size="small" color={COLORS.white} />
                          : <Text style={styles.cancelFormPrimaryText}>Confirmar</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  label: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  value: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: COLORS.textMuted },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  navTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
  navActions: { flexDirection: 'row', gap: 4 },
  navBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { flex: 1 },
  card: {
    margin: 16, marginBottom: 0,
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: COLORS.border,
  },
  actionsCard: {
    margin: 16, marginBottom: 0,
    borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: '#FEE2E2',
    backgroundColor: '#FFF8F8',
  },
  incidentTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 28, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  photo: { width: '100%', height: 200, borderRadius: 12 },
  // Edit mode
  editInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, height: 48, fontSize: 14,
    color: COLORS.textPrimary, backgroundColor: COLORS.background,
  },
  editTextArea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  editBtns: {
    flexDirection: 'row', gap: 12,
    margin: 16, marginBottom: 0,
  },
  cancelEditBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  cancelEditBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    flex: 2, height: 48, borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  // Cancel incident form
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.danger },
  cancelForm: { gap: 12 },
  cancelFormLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  textArea: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 12, fontSize: 14, color: COLORS.textPrimary,
    backgroundColor: COLORS.surface, minHeight: 80,
  },
  cancelFormBtns: { flexDirection: 'row', gap: 10 },
  cancelFormSecondary: {
    flex: 1, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelFormSecondaryText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  cancelFormPrimary: {
    flex: 1, padding: 12, borderRadius: 12,
    backgroundColor: COLORS.danger, alignItems: 'center',
  },
  cancelFormPrimaryText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
});
