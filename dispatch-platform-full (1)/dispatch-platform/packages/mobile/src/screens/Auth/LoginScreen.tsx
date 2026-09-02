import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import { login, clearError } from '../../store/slices/authSlice';
import { selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';
import { selectLanguage } from '../../store/slices/appSlice';
import { lightColors as colors } from '../../theme';
import type { Language } from '@dispatch/shared';

const LoginScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const language = useAppSelector(selectLanguage) as Language;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = (key: string) => {
    const dict: Record<string, Record<Language, string>> = {
      'auth.login_title': { en: 'Welcome Back', fr: 'Bon retour', es: 'Bienvenido de nuevo', [language]: '' },
      'auth.login_subtitle': { en: 'Sign in to continue', fr: 'Connectez-vous pour continuer', es: 'Inicia sesión para continuar', [language]: '' },
      'auth.email': { en: 'Email', fr: 'E-mail', es: 'Correo electrónico', [language]: '' },
      'auth.password': { en: 'Password', fr: 'Mot de passe', es: 'Contraseña', [language]: '' },
      'common.login': { en: 'Login', fr: 'Connexion', es: 'Iniciar sesión', [language]: '' },
      'common.register': { en: 'Register', fr: "S'inscrire", es: 'Registrarse', [language]: '' },
      'common.no_account': { en: "Don't have an account?", fr: 'Vous n\'avez pas de compte ?', es: '¿No tienes cuenta?', [language]: '' },
      'common.forgot_password': { en: 'Forgot Password?', fr: 'Mot de passe oublié ?', es: '¿Olvidaste tu contraseña?', [language]: '' },
    };
    return dict[key]?.[language] || dict[key]?.en || key;
  };

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      // Navigation handled by root navigator based on isAuthenticated
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo / Brand */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🚛</Text>
            </View>
            <Text style={styles.title}>{t('auth.login_title')}</Text>
            <Text style={styles.subtitle}>{t('auth.login_subtitle')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>{t('common.forgot_password')}</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('common.login')}</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login (placeholders) */}
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>📱 Continue with Phone</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>🔗 Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('common.no_account')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>{t('common.register')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  logo: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    height: 52, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 16, fontSize: 16,
    backgroundColor: colors.surface, color: colors.text,
  },
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1 },
  eyeButton: { position: 'absolute', right: 16, padding: 4 },
  forgotButton: { alignSelf: 'flex-end', marginTop: 4 },
  forgotText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  primaryButton: {
    height: 56, backgroundColor: colors.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 16, color: colors.textMuted, fontSize: 12 },
  socialButton: {
    height: 52, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    backgroundColor: colors.surface,
  },
  socialButtonText: { fontSize: 15, fontWeight: '600', color: colors.text },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 4 },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default LoginScreen;
