import React, { useState } from 'react';
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
import { register, clearError } from '../../store/slices/authSlice';
import { selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';
import { lightColors as colors } from '../../theme';
import type { UserRole } from '@dispatch/shared';

const RegisterScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  const initialRole = route.params?.role || 'carrier';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    role: initialRole as UserRole,
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { email, password, confirmPassword, firstName, lastName, role } = formData;

    if (!email || !password || !firstName || !lastName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    const result = await dispatch(
      register({
        email,
        password,
        role,
        firstName,
        lastName,
        companyName: formData.companyName,
        phone: formData.phone,
      })
    );

    if (register.fulfilled.match(result)) {
      // Navigation handled by root navigator
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join thousands of drivers and shippers
            </Text>
          </View>

          {/* Role Selector */}
          <View style={styles.roleSelector}>
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'carrier' && styles.roleButtonActive,
                ]}
                onPress={() => updateField('role', 'carrier')}
              >
                <Text style={styles.roleIcon}>🚛</Text>
                <Text
                  style={[
                    styles.roleText,
                    formData.role === 'carrier' && styles.roleTextActive,
                  ]}
                >
                  Trucker
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'shipper' && styles.roleButtonActive,
                ]}
                onPress={() => updateField('role', 'shipper')}
              >
                <Text style={styles.roleIcon}>📦</Text>
                <Text
                  style={[
                    styles.roleText,
                    formData.role === 'shipper' && styles.roleTextActive,
                  ]}
                >
                  Shipper
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Name Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(v) => updateField('firstName', v)}
                  placeholder="John"
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(v) => updateField('lastName', v)}
                  placeholder="Doe"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(v) => updateField('email', v)}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(v) => updateField('phone', v)}
                placeholder="+1 (555) 000-0000"
                keyboardType="phone-pad"
              />
            </View>

            {/* Company */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={styles.input}
                value={formData.companyName}
                onChangeText={(v) => updateField('companyName', v)}
                placeholder="ABC Transport LLC"
                autoCapitalize="words"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(v) => updateField('password', v)}
                placeholder="Min 8 characters"
                secureTextEntry
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(v) => updateField('confirmPassword', v)}
                placeholder="Re-enter password"
                secureTextEntry
              />
            </View>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our Terms of Service & Privacy Policy
          </Text>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Login</Text>
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
  header: { marginTop: 20, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary },

  roleSelector: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  roleButtons: { flexDirection: 'row', gap: 12 },
  roleButton: {
    flex: 1, padding: 16, borderRadius: 12, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface,
  },
  roleButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  roleIcon: { fontSize: 32, marginBottom: 8 },
  roleText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  roleTextActive: { color: colors.primary },

  form: { gap: 16, marginBottom: 16 },
  row: { flexDirection: 'row' },
  inputGroup: { gap: 8 },
  input: {
    height: 52, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 16, fontSize: 16,
    backgroundColor: colors.surface, color: colors.text,
  },

  terms: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginVertical: 16 },

  primaryButton: {
    height: 56, backgroundColor: colors.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default RegisterScreen;
