import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchTrips,
  selectActiveTrip,
  selectTripsLoading,
  updateTripStatus,
} from '../../store/slices/tripsSlice';
import {
  startTracking,
  stopTracking,
} from '../../services/locationService';
import { lightColors as colors } from '../../theme';
import type { TripStatus } from '@dispatch/shared';

const ActiveTripScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const activeTrip = useAppSelector(selectActiveTrip);
  const loading = useAppSelector(selectTripsLoading);

  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    dispatch(fetchTrips({ status: 'in_transit' }));
  }, []);

  const handleStatusUpdate = async (status: TripStatus) => {
    if (!activeTrip) return;
    Alert.alert(
      'Update Status',
      `Change trip status to "${status.replace('_', ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await dispatch(updateTripStatus({ id: activeTrip.id, status }));
          },
        },
      ]
    );
  };

  const toggleTracking = async () => {
    if (tracking) {
      stopTracking();
      setTracking(false);
    } else {
      try {
        await startTracking();
        setTracking(true);
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    }
  };

  if (loading && !activeTrip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!activeTrip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🚛</Text>
          <Text style={styles.emptyTitle}>No Active Trip</Text>
          <Text style={styles.emptyText}>
            Accept a load and start your trip to see it here
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.primaryButtonText}>Find Loads</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(activeTrip.status) + '20' }]}>
          <Text style={styles.statusEmoji}>{getStatusEmoji(activeTrip.status)}</Text>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusText, { color: getStatusColor(activeTrip.status) }]}>
              {activeTrip.status.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.statusSubtext}>Trip #{activeTrip.id.slice(0, 8)}</Text>
          </View>
        </View>

        {/* Route Info */}
        <View style={styles.card}>
          <View style={styles.routeRow}>
            <Text style={styles.routeEmoji}>📍</Text>
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeValue}>{activeTrip.load?.origin?.city}, {activeTrip.load?.origin?.state}</Text>
            </View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <Text style={styles.routeEmoji}>🏁</Text>
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>DELIVERY</Text>
              <Text style={styles.routeValue}>{activeTrip.load?.destination?.city}, {activeTrip.load?.destination?.state}</Text>
            </View>
          </View>
        </View>

        {/* Tracking Toggle */}
        <TouchableOpacity
          style={[styles.trackingButton, tracking && styles.trackingButtonActive]}
          onPress={toggleTracking}
        >
          <Text style={styles.trackingIcon}>{tracking ? '🛰️' : '📡'}</Text>
          <Text style={styles.trackingText}>
            {tracking ? 'Tracking Active' : 'Start GPS Tracking'}
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          {activeTrip.status === 'assigned' && (
            <ActionButton
              icon="🚛"
              label="Start Trip"
              onPress={() => handleStatusUpdate('in_transit')}
            />
          )}
          {activeTrip.status === 'in_transit' && (
            <ActionButton
              icon="📦"
              label="Arrived Pickup"
              onPress={() => handleStatusUpdate('at_pickup')}
            />
          )}
          {activeTrip.status === 'at_pickup' && (
            <ActionButton
              icon="✅"
              label="Confirm Pickup"
              onPress={() => handleStatusUpdate('loaded')}
            />
          )}
          {activeTrip.status === 'loaded' && (
            <ActionButton
              icon="🏁"
              label="Arrived Delivery"
              onPress={() => handleStatusUpdate('at_delivery')}
            />
          )}
          {activeTrip.status === 'at_delivery' && (
            <ActionButton
              icon="🎉"
              label="Complete Delivery"
              onPress={() => handleStatusUpdate('delivered')}
            />
          )}
          <ActionButton
            icon="🗺️"
            label="Live Map"
            onPress={() => navigation.navigate('MapView', { tripId: activeTrip.id })}
          />
          <ActionButton
            icon="📋"
            label="Upload BOL"
            onPress={() => navigation.navigate('UploadDocument', { type: 'bol' })}
          />
          <ActionButton
            icon="💬"
            label="Message"
            onPress={() => navigation.navigate('ChatScreen', { conversationId: '' })}
          />
          <ActionButton
            icon="⚠️"
            label="Report Issue"
            onPress={() => Alert.alert('Report', 'Issue reporting coming soon')}
          />
        </View>

        {/* Trip Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          <DetailRow label="Distance" value={`${activeTrip.load?.distance || 0} mi`} />
          <DetailRow label="Rate" value={`$${activeTrip.load?.rate?.toLocaleString() || 0}`} />
          <DetailRow label="Equipment" value={activeTrip.load?.equipmentType?.replace('_', ' ') || 'N/A'} />
          <DetailRow label="Started" value={activeTrip.actualPickup ? new Date(activeTrip.actualPickup).toLocaleString() : 'Not started'} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getStatusColor = (status: TripStatus): string => {
  const map: Record<string, string> = {
    assigned: '#F39C12',
    in_transit: '#3498DB',
    at_pickup: '#9B59B6',
    loaded: '#2980B9',
    at_delivery: '#E67E22',
    delivered: '#27AE60',
    cancelled: '#E74C3C',
  };
  return map[status] || '#6C757D';
};

const getStatusEmoji = (status: TripStatus): string => {
  const map: Record<string, string> = {
    assigned: '📋',
    in_transit: '🚛',
    at_pickup: '📦',
    loaded: '✅',
    at_delivery: '🏁',
    delivered: '🎉',
    cancelled: '❌',
  };
  return map[status] || '📋';
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const ActionButton: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Text style={styles.actionIcon}>{icon}</Text>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  primaryButton: {
    height: 52, paddingHorizontal: 32, backgroundColor: colors.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', margin: 16, padding: 16,
    borderRadius: 16,
  },
  statusEmoji: { fontSize: 32, marginRight: 12 },
  statusInfo: { flex: 1 },
  statusText: { fontSize: 18, fontWeight: '700' },
  statusSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginVertical: 8, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },

  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  routeEmoji: { fontSize: 24, marginRight: 12, width: 32 },
  routeText: { flex: 1 },
  routeLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  routeValue: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 2 },
  routeDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 44 },

  trackingButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginVertical: 8, padding: 16, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
  },
  trackingButtonActive: { borderColor: colors.success, backgroundColor: colors.success + '10' },
  trackingIcon: { fontSize: 20, marginRight: 8 },
  trackingText: { fontSize: 15, fontWeight: '600', color: colors.text },

  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginVertical: 8,
  },
  actionButton: {
    width: '47%', backgroundColor: colors.surface, borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 12, color: colors.text, fontWeight: '600', textAlign: 'center' },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
});

export default ActiveTripScreen;
