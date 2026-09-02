import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../store';
import { createRating } from '../../store/slices/ratingsSlice';
import { lightColors as colors } from '../../theme';

const RatingScreen = ({ route, navigation }: any) => {
  const { tripId, ratedUserId } = route.params;
  const dispatch = useAppDispatch();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setSubmitting(true);
    const result = await dispatch(
      createRating({ tripId, ratedUserId, rating, comment })
    );
    setSubmitting(false);

    if (createRating.fulfilled.match(result)) {
      Alert.alert('Thank you!', 'Your rating has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Rate Your Experience</Text>
        <Text style={styles.subtitle}>Trip #{tripId.slice(0, 8)}</Text>

        {/* Star Rating */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Text style={[styles.star, rating >= star && styles.starActive]}>
                {rating >= star ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ratingText}>
          {rating > 0 ? `${rating} out of 5` : 'Tap to rate'}
        </Text>

        {/* Comment */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Comments (Optional)</Text>
          <TextInput
            style={[styles.input, styles.commentInput]}
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience..."
            multiline
            maxLength={500}
          />
        </View>
      </View>

      {/* Submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, alignItems: 'center' },

  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 40 },

  starsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  starButton: { padding: 4 },
  star: { fontSize: 48, color: colors.border },
  starActive: { color: colors.secondary },

  ratingText: { fontSize: 16, color: colors.textSecondary, marginBottom: 40 },

  inputGroup: { width: '100%', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },

  input: {
    minHeight: 52, backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top',
  },
  commentInput: { minHeight: 120, width: '100%' },

  footer: { width: '100%', padding: 24, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  submitButton: {
    height: 56, backgroundColor: colors.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});

export default RatingScreen;
