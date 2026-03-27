import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants';

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists') || m.includes('email address is already')) {
    return 'Este correo ya está registrado. Usá otro o iniciá sesión.';
  }
  return msg;
}

function validatePassword(pass: string): string | null {
  if (pass.length < 6) return 'Debe tener al menos 6 caracteres.';
  if (!/[A-Z]/.test(pass)) return 'Debe tener al menos una mayúscula.';
  if (!/[^a-zA-Z0-9]/.test(pass)) return 'Debe tener al menos un carácter especial (!@#$%...).';
  return null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const passOk = {
    length: password.length >= 6,
    upper: /[A-Z]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };

  async function handleRegister() {
    setErrorMsg('');
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg('Por favor completá todos los campos.');
      return;
    }
    const passError = validatePassword(password);
    if (passError) { setErrorMsg(passError); return; }
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), role: 'user' } },
    });
    setLoading(false);

    if (error) { setErrorMsg(friendlyError(error.message)); return; }
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
                <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {password.length > 0 && (
              <View style={styles.requirements}>
                <Req met={passOk.length} text="Mínimo 6 caracteres" />
                <Req met={passOk.upper} text="Al menos una mayúscula" />
                <Req met={passOk.special} text="Al menos un carácter especial" />
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Repetir contraseña</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithAction]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repetí tu contraseña"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <MaterialIcons name={showConfirm ? 'visibility' : 'visibility-off'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
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
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Crear cuenta</Text>}
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

function Req({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.req}>
      <MaterialIcons name={met ? 'check-circle' : 'radio-button-unchecked'} size={14} color={met ? COLORS.success : COLORS.textMuted} />
      <Text style={[styles.reqText, met && styles.reqTextMet]}>{text}</Text>
    </View>
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
    top: 60, left: 20,
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 64, height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 26, fontWeight: '800', color: COLORS.white, letterSpacing: 1 },
  card: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 50,
    flex: 1,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 28 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, backgroundColor: COLORS.background,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 50, fontSize: 15, color: COLORS.textPrimary },
  inputWithAction: { paddingRight: 8 },
  eyeBtn: { padding: 4 },
  requirements: { marginTop: 8, gap: 4 },
  req: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reqText: { fontSize: 12, color: COLORS.textMuted },
  reqTextMet: { color: COLORS.success },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: { fontSize: 13, color: COLORS.danger, flex: 1 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    height: 52, justifyContent: 'center', alignItems: 'center',
    marginTop: 8, marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14, color: COLORS.textMuted },
  loginLink: { fontSize: 14, color: COLORS.accent, fontWeight: '600' },
});
