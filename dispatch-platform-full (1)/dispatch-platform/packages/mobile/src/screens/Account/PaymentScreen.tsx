import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../store';
import { createPaymentIntent, requestPayout } from '../../store/slices/paymentsSlice';
import { lightColors as colors } from '../../theme';

const PaymentScreen = ({ route, navigation }: any) => {
  const { tripId, amount } = route.params;
  const dispatch = useAppDispatch();
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    // In production, integrate Stripe SDK here
    const result = await dispatch(createPaymentIntent({ tripId, amount }));
    setProcessing(false);

    if (createPaymentIntent.fulfilled.match(result)) {
      Alert.alert('Success', 'Payment processed! Funds are now in escrow.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handlePayout = async () => {
    setProcessing(true);
    const result = await dispatch(requestPayout({ amount, method: 'bank_transfer' }));
    setProcessing(false);

    if (requestPayout.fulfilled.match(result)) {
      Alert.alert('Success', 'Payout requested! Funds will arrive in 2-3 business days.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.subtitle}>Trip #{tripId.slice(0, 8)}</Text>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>${amount?.toLocaleString() || '0'}</Text>
          <Text style={styles.amountNote}>Held in escrow until delivery confirmed</Text>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity style={styles.paymentMethod}>
            <Text style={styles.paymentIcon}>💳</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Visa ending in 4242</Text>
              <Text style={styles.paymentExpiry}>Expires 12/27</Text>
            </View>
            <Text style={styles.paymentArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Escrow Info */}
        <View style={styles.escrowBox}>
          <Text style={styles.escrowIcon}>🔒</Text>
          <View style={styles.escrowText}>
            <Text style={styles.escrowTitle}>Escrow Protection</Text>
            <Text style={styles.escrowDesc}>
              Funds are held securely until both parties confirm delivery. This protects both
              shippers and carriers from fraud.
            </Text>
          </View>
        </View>

        {/* Fee Breakdown */}
        <View style={styles.feeBreakdown}>
          <Text style={styles.sectionTitle}>Fee Breakdown</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Load Amount</Text>
            <Text style={styles.feeValue}>${amount?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Platform Fee (5%)</Text>
            <Text style={styles.feeValue}>-${Math.round((amount || 0) * 0.05).toLocaleString()}</Text>
          </View>
          <View style={[styles.feeRow, styles.feeTotal]}>
            <Text style={styles.feeTotalLabel}>You Receive</Text>
            <Text style={styles.feeTotalValue}>${Math.round((amount || 0) * 0.95).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.footer}>
        {tripId ? (
          <TouchableOpacity
            style={[styles.primaryButton, processing && styles.buttonDisabled]}
            onPress={handlePayment}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Pay & Fund Escrow</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, processing && styles.buttonDisabled]}
            onPress={handlePayout}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Request Payout</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24 },

  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },

  amountCard: {
    backgroundColor: colors.primary, borderRadius: 16, padding: 24, alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: { color: colors.white + '80', fontSize: 14 },
  amountValue: { color: colors.white, fontSize: 40, fontWeight: '800', marginVertical: 8 },
  amountNote: { color: colors.white + '60', fontSize: 12, textAlign: 'center' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },

  paymentMethod: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  paymentIcon: { fontSize: 28, marginRight: 12 },
  paymentInfo: { flex: 1 },
  paymentName: { fontSize: 15, fontWeight: '600', color: colors.text },
  paymentExpiry: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  paymentArrow: { fontSize: 20, color: colors.textMuted },

  escrowBox: {
    flexDirection: 'row', padding: 16, backgroundColor: colors.success + '10',
    borderRadius: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: colors.success,
  },
  escrowIcon: { fontSize: 24, marginRight: 12 },
  escrowText: { flex: 1 },
  escrowTitle: { fontSize: 14, fontWeight: '700', color: colors.success, marginBottom: 4 },
  escrowDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  feeBreakdown: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  feeLabel: { fontSize: 14, color: colors.textSecondary },
  feeValue: { fontSize: 14, color: colors.text },

  feeTotal: { borderBottomWidth: 0, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  feeTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  feeTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },

  footer: { padding: 24, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  primaryButton: {
    height: 56, backgroundColor: colors.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});

export default PaymentScreen;
