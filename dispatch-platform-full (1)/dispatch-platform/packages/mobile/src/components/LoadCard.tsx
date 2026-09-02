import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { lightColors as colors } from '../theme';
import type { Load } from '@dispatch/shared';

interface LoadCardProps {
  load: Load;
  onPress?: () => void;
}

export const LoadCard: React.FC<LoadCardProps> = ({ load, onPress }) => {
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatWeight = (lbs: number) => {
    if (lbs >= 2000) return `${(lbs / 2000).toFixed(1)}k lbs`;
    return `${lbs} lbs`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Header: Rate & Status */}
      <View style={styles.header}>
        <View style={styles.rateContainer}>
          <Text style={styles.rate}>{formatCurrency(load.rate)}</Text>
          <Text style={styles.rateLabel}>total</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.statusText, { color: colors.warning }]}>
            {load.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>PICKUP</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {load.origin.city}, {load.origin.state}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>DELIVERY</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {load.destination.city}, {load.destination.state}
            </Text>
          </View>
        </View>
      </View>

      {/* Details Row */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📏</Text>
          <Text style={styles.detailText}>{load.distance} mi</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⚖️</Text>
          <Text style={styles.detailText}>{formatWeight(load.weight)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>🚛</Text>
          <Text style={styles.detailText}>{load.equipmentType.replace('_', ' ')}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>
            {new Date(load.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.postedBy}>Posted by {load.shipper?.companyName || 'Verified Shipper'}</Text>
        <Text style={styles.timeAgo}>2h ago</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  rateContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  rate: { fontSize: 24, fontWeight: '700', color: colors.primary },
  rateLabel: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },

  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '700' },

  route: { marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  locationText: { flex: 1 },
  locationLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  locationValue: { fontSize: 15, color: colors.text, fontWeight: '500' },

  routeLine: {
    width: 2, height: 12, backgroundColor: colors.border,
    marginLeft: 4, marginVertical: 2,
  },

  details: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  detailItem: { alignItems: 'center', flex: 1 },
  detailIcon: { fontSize: 16, marginBottom: 2 },
  detailText: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  postedBy: { fontSize: 12, color: colors.textSecondary },
  timeAgo: { fontSize: 12, color: colors.textMuted },
});

export default LoadCard;
