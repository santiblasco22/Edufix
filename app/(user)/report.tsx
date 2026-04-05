import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { IncidentPriority, IncidentCategory } from '@/types';
import { COLORS, PRIORITY_LABELS, CATEGORY_LABELS, CATEGORY_ICONS } from '@/constants';

const PRIORITIES: IncidentPriority[] = ['low', 'medium', 'high', 'critical'];
const CATEGORIES: IncidentCategory[] = ['infrastructure', 'equipment', 'cleaning', 'electrical', 'plumbing', 'security', 'other'];

const PRIORITY_CONFIG: Record<IncidentPriority, { color: string; bg: string; border: string }> = {
  low: { color: '#065F46', bg: '#D1FAE5', border: '#A7F3D0' },
  medium: { color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  high: { color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
  critical: { color: '#5B21B6', bg: '#EDE9FE', border: '#C4B5FD' },
};

export default function ReportIncident() {
  const { profile } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<IncidentPriority>('medium');
  const [category, setCategory] = useState<IncidentCategory>('infrastructure');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function resetForm() {
    setTitle('');
    setDescription('');
    setLocation('');
    setPriority('medium');
    setCategory('infrastructure');
    setPhoto(null);
    setErrorMsg('');
  }

  function showError(msg: string) {
    setErrorMsg(msg);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para fotografiar incidentes.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  }

  async function uploadPhoto(uri: string): Promise<string | null> {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `incidents/${Date.now()}_${profile?.user_id}.jpg`;
      const { error } = await supabase.storage
        .from('incident-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const { data } = supabase.storage.from('incident-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setErrorMsg('');

    if (!title.trim()) { showError('Por favor ingresá un título.'); return; }
    if (!description.trim()) { showError('Por favor ingresá una descripción.'); return; }
    if (!profile) { showError('Sin sesión activa. Cerrá sesión y volvé a entrar.'); return; }
    if (!profile.user_id) { showError('ID de usuario vacío. Cerrá sesión y volvé a entrar.'); return; }

    const institutionId = profile.institution_id ?? '00000000-0000-0000-0000-000000000001';

    setSubmitting(true);
    try {
      // Verificar que la sesión esté activa antes de insertar
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        showError('La sesión expiró. Cerrá sesión y volvé a entrar.');
        return;
      }

      let photoUrl: string | null = null;
      if (photo) photoUrl = await uploadPhoto(photo);

      const { data: insertedData, error } = await supabase.from('incidents').insert({
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || null,
        priority,
        category,
        status: 'pending',
        photo_url: photoUrl,
        reported_by: profile.user_id,
        institution_id: institutionId,
        updated_at: new Date().toISOString(),
      }).select('id');

      if (error) {
        let msg: string;
        const msgLower = error.message?.toLowerCase() ?? '';
        if (msgLower.includes('network') || msgLower.includes('fetch') || msgLower.includes('failed')) {
          msg = 'Sin conexión. Verificá que el proyecto de Supabase no esté pausado.';
        } else if (error.code === '42501') {
          msg = 'Sin permisos (RLS). Cerrá sesión y volvé a entrar.';
        } else if (error.code === '23503') {
          msg = 'La institución no existe en la DB. Ejecutá el SQL de supabase-updates.sql.';
        } else if (error.code === '23502') {
          msg = 'Falta un campo obligatorio. Verificá los datos.';
        } else {
          msg = `Error [${error.code ?? '?'}]: ${error.message}`;
        }
        showError(msg);
        return;
      }

      if (!insertedData || insertedData.length === 0) {
        showError('El reporte no se creó. Verificá que ejecutaste el SQL en Supabase Dashboard.');
        return;
      }

      resetForm();
      router.replace('/(user)/');
    } catch (e: any) {
      const msgLower = e?.message?.toLowerCase() ?? '';
      const isNetwork = msgLower.includes('network') || msgLower.includes('fetch') || msgLower.includes('failed');
      showError(
        isNetwork
          ? 'Sin conexión. Verificá que el proyecto de Supabase no esté pausado.'
          : `Error inesperado: ${e?.message ?? 'desconocido'}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>Reportar incidente</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error banner — al tope para que siempre sea visible */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>Título del incidente <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej: Silla rota en aula 305"
              placeholderTextColor={COLORS.textMuted}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Descripción <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describí el problema con el mayor detalle posible..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Ubicación</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="place" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputInner}
                value={location}
                onChangeText={setLocation}
                placeholder="Ej: Aula 305, Piso 3, Edificio A"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <MaterialIcons
                    name={CATEGORY_ICONS[cat] as keyof typeof MaterialIcons.glyphMap}
                    size={16}
                    color={category === cat ? COLORS.white : COLORS.textSecondary}
                  />
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.priorityGrid}>
              {PRIORITIES.map(p => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      { borderColor: cfg.border },
                      priority === p && { backgroundColor: cfg.bg },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: cfg.color }]} />
                    <Text style={[styles.priorityLabel, priority === p && { color: cfg.color, fontWeight: '700' }]}>
                      {PRIORITY_LABELS[p]}
                    </Text>
                    {priority === p && (
                      <MaterialIcons name="check" size={14} color={cfg.color} style={styles.priorityCheck} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Foto adjunta</Text>
            {photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo }} style={styles.photoImg} resizeMode="cover" />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(null)}>
                  <MaterialIcons name="close" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.7}>
                  <MaterialIcons name="photo-camera" size={22} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>Tomar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.7}>
                  <MaterialIcons name="photo-library" size={22} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>Galería</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (submitting || uploading) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || uploading}
            activeOpacity={0.85}
          >
            {submitting || uploading
              ? <ActivityIndicator color={COLORS.white} />
              : <>
                <MaterialIcons name="send" size={18} color={COLORS.white} />
                <Text style={styles.submitBtnText}>Enviar reporte</Text>
              </>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  navbar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: { fontSize: 13, color: COLORS.danger, flex: 1, lineHeight: 18 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 22 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  required: { color: COLORS.danger },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  inputInner: { flex: 1, height: 50, fontSize: 15, color: COLORS.textPrimary },
  chipScroll: { marginLeft: -2 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  categoryChipTextActive: { color: COLORS.white },
  priorityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: COLORS.surface,
    minWidth: '45%',
    flex: 1,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  priorityCheck: { marginLeft: 'auto' },
  photoPreview: { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: 200 },
  removePhoto: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActions: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: COLORS.accentLight,
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});
