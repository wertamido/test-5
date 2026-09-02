import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../store';
import { createBid } from '../../store/slices/bidsSlice';
import { lightColors as colors } from '../../theme';

const BidScreen = ({ route, navigation }: any) => {
  const { loadId, suggestedAmount } = route.params;
  const dispatch = useAppDispatch();

  const [amount, setAmount] = useState(suggestedAmount?.toString() || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount < 100) {
      Alert.alert('Error', 'Please enter a valid bid amount');
      return;
    }

    setSubmitting(true);
    const result = await dispatch(createBid({ loadId, amount: numericAmount, message }));
    setSubmitting(false);

    if (createBid.fulfilled.match(result)) {
      Alert.alert('Success', 'Your bid has been placed!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.title}>Place Your Bid</Text>
          <Text style={styles.subtitle}>Load #{loadId.slice(0, 8)}</Text>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Bid Amount (USD)</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                autoFocus
              />
            </View>
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {[2000, 2200, 2500, 2800].map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.quickAmount}
                onPress={() => setAmount(val.toString())}
              >
                <Text style={styles.quickAmountText}>${val.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message (Optional)</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="e.g., Available immediately, can pickup today..."
              multiline
              maxLength={500}
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 Bidding Tips</Text>
            <Text style={styles.infoText}>• Competitive bids get accepted faster</Text>
            <Text style={styles.infoText}>• Include availability in your message</Text>
            <Text style={styles.infoText}>• You can update your bid until accepted</Text>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Place Bid</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 32 },

  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },

  amountContainer: {
    flexDirection: 'row', alignItems: 'center', height: 64,
    backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16,
    borderWidth: 2, borderColor: colors.primary,
  },
  currencySymbol: { fontSize: 24, color: colors.textMuted, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: colors.text },

  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  quickAmount: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30',
  },
  quickAmountText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  input: {
    minHeight: 52, backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top',
  },
  messageInput: { minHeight: 100 },

  infoBox: {
    backgroundColor: colors.info + '10', borderRadius: 12,
    padding: 16, borderLeftWidth: 4, borderLeftColor: colors.info,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: colors.info, marginBottom: 8 },
  infoText: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },

  footer: { padding: 24, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  submitButton: {
    height: 56, backgroundColor: colors.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});

export default BidScreen;
