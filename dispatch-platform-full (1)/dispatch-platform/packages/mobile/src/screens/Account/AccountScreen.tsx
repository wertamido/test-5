import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectUser } from '../../store/slices/authSlice';
import { selectTheme, selectLanguage } from '../../store/slices/appSlice';
import { lightColors as colors } from '../../theme';
import i18n from '../../i18n';

const AccountScreen = ({ navigation }: any) => {
  const user = useAppSelector(selectUser);
  const theme = useAppSelector(selectTheme);
  const language = useAppSelector(selectLanguage);
  const dispatch = useAppDispatch();

  const menuItems = [
    { icon: '👤', title: 'Profile', subtitle: 'View and edit your profile', screen: 'Profile' },
    { icon: '🚛', title: 'My Vehicles', subtitle: `${user?.vehicles?.length || 0} vehicles registered`, screen: 'Vehicles' },
    { icon: '📄', title: 'Documents', subtitle: 'Insurance, license, DOT number', screen: 'Documents' },
    { icon: '💰', title: 'Earnings', subtitle: 'View your earnings and payouts', screen: 'Earnings' },
    { icon: '⭐', title: 'Subscription', subtitle: 'Manage your plan', screen: 'Subscription' },
    { icon: '🌙', title: 'Appearance', subtitle: `Currently: ${theme}`, action: () => {
      dispatch({ type: 'app/setTheme', payload: theme === 'dark' ? 'light' : 'dark' });
    }},
    { icon: '🔔', title: 'Notifications', subtitle: 'Push & email preferences', screen: 'Notifications' },
    { icon: '🌐', title: 'Language', subtitle: i18n.getAvailableLanguages().find(l => l.code === language)?.name || 'English', screen: 'Language' },
    { icon: '🔒', title: 'Privacy & Security', subtitle: 'Password, 2FA, biometric', screen: 'Settings' },
    { icon: '❓', title: 'Help & Support', subtitle: 'FAQ, contact support', screen: 'Settings' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User'}
          </Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
          <View style={styles.verificationRow}>
            <Text style={styles.verificationIcon}>
              {user?.isVerified ? '✅' : '⚠️'}
            </Text>
            <Text style={[styles.verificationText, !user?.isVerified && styles.unverified]}>
              {user?.isVerified ? 'Verified' : 'Verification Pending'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>⭐ {user?.rating || '0.0'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.completedTrips || 0}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.onTimePercentage || 0}%</Text>
          <Text style={styles.statLabel}>On-time</Text>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuList}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => item.screen && navigation.navigate(item.screen)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => dispatch({ type: 'auth/logout/fulfilled' })}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  profileHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  verificationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  verificationIcon: { fontSize: 12, marginRight: 4 },
  verificationText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  unverified: { color: colors.warning },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 16, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },

  menuList: { flex: 1, paddingTop: 8 },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  menuIcon: { fontSize: 24, width: 36, marginRight: 12 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 20, color: colors.textMuted },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface, marginTop: 8,
  },
  logoutIcon: { fontSize: 22, width: 36, marginRight: 12 },
  logoutText: { fontSize: 15, fontWeight: '600', color: colors.error },

  version: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: 16, marginBottom: 32 },
});

export default AccountScreen;
