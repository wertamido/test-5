import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchEarnings,
  selectEarnings,
  selectPaymentsLoading,
} from '../../store/slices/paymentsSlice';
import { lightColors as colors } from '../../theme';

const EarningsScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const earnings = useAppSelector(selectEarnings);
  const loading = useAppSelector(selectPaymentsLoading);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchEarnings());
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchEarnings());
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Earnings</Text>
        </View>

        {/* Balance Cards */}
        <View style={styles.balanceContainer}>
          <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(earnings.thisMonth)}</Text>
            <Text style={styles.balanceSubtext}>This month</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(earnings.total)}</Text>
            <Text style={styles.statLabel}>All Time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(earnings.thisWeek)}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>

        {/* Chart Placeholder */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Earnings Overview</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartEmoji}>📈</Text>
            <Text style={styles.chartText}>Earnings chart coming soon</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PaymentScreen', { tripId: '', amount: 0 })}
          >
            <Text style={styles.actionIcon}>💳</Text>
            <Text style={styles.actionText}>Request Payout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.actionIcon}>⭐</Text>
            <Text style={styles.actionText}>Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Earnings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {earnings.history.length > 0 ? (
            earnings.history.slice(0, 10).map((entry, index) => (
              <View key={index} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Text>💰</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Trip Payment</Text>
                  <Text style={styles.activityDate}>
                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.activityAmount}>+{formatCurrency(entry.amount)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No earnings history yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },

  balanceContainer: { paddingHorizontal: 16, marginBottom: 16 },
  balanceCard: { borderRadius: 16, padding: 24, alignItems: 'center' },
  balanceLabel: { color: colors.white + '80', fontSize: 14 },
  balanceAmount: { color: colors.white, fontSize: 36, fontWeight: '800', marginVertical: 8 },
  balanceSubtext: { color: colors.white + '60', fontSize: 12 },

  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },

  chartCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  chartPlaceholder: { height: 160, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50, borderRadius: 12 },
  chartEmoji: { fontSize: 40, marginBottom: 8 },
  chartText: { color: colors.textSecondary, fontSize: 14 },

  actionsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  actionButton: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionText: { fontSize: 13, color: colors.text, fontWeight: '600' },

  sectionCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  activityDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  activityAmount: { fontSize: 15, fontWeight: '700', color: colors.success },

  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});

export default EarningsScreen;
