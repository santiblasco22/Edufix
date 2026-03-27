import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants';
import { UserRole } from '@/types';

const ROLE_OPTIONS: { value: UserRole; label: string; description: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'user', label: 'Alumno / Docente', description: 'Reportar y seguir incidentes', icon: 'person' },
  { value: 'staff', label: 'Personal de Gestión', description: 'Gestionar y resolver incidentes', icon: 'engineering' },
  { value: 'admin', label: 'Administrador', description: 'Acceso total y configuración', icon: 'admin-panel-settings' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleRegister() {
    setErrorMsg('');
    if (!fullName || !email || !password) {
      setErrorMsg('Por favor completá todos los campos.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName, role } },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.replace('/(auth)/login');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <MaterialIcons name="school" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.appName}>EduFix</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Completá tus datos para registrarte</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Tu nombre y apellido"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="email" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="usuario@institucion.edu.ar"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithAction]}
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Rol en la institución</Text>
            <View style={styles.roleList}>
              {ROLE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.roleOption, role === option.value && styles.roleOptionSelected]}
                  onPress={() => setRole(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roleIcon, role === option.value && styles.roleIconSelected]}>
                    <MaterialIcons
                      name={option.icon}
                      size={20}
                      color={role === option.value ? COLORS.primary : COLORS.textMuted}
                    />
                  </View>
                  <View style={styles.roleTextWrapper}>
                    <Text style={[styles.roleLabel, role === option.value && styles.roleLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.roleDesc}>{option.description}</Text>
                  </View>
                  <View style={[styles.radioOuter, role === option.value && styles.radioOuterSelected]}>
                    {role === option.value && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={16} color={COLORS.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.btnText}>Crear cuenta</Text>
            }
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>¿Ya tenés cuenta? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 50,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 28,
  },
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputWithAction: { paddingRight: 8 },
  eyeBtn: { padding: 4 },
  roleList: { gap: 10 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  roleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accentLight,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIconSelected: {
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
  },
  roleTextWrapper: { flex: 1 },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  roleLabelSelected: { color: COLORS.primary },
  roleDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: { fontSize: 13, color: COLORS.danger, flex: 1 },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: { fontSize: 14, color: COLORS.textMuted },
  loginLink: { fontSize: 14, color: COLORS.accent, fontWeight: '600' },
});
