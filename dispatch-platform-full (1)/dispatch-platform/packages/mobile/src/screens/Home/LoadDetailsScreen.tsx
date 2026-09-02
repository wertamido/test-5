import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchLoadById,
  selectCurrentLoad,
  selectLoadsLoading,
  saveLoad,
  unsaveLoad,
} from '../../store/slices/loadsSlice';
import {
  fetchLoadBids,
  selectLoadBids,
} from '../../store/slices/bidsSlice';
import { selectUserRole } from '../../store/slices/authSlice';
import { lightColors as colors } from '../../theme';

const LoadDetailsScreen = ({ route, navigation }: any) => {
  const { loadId } = route.params;
  const dispatch = useAppDispatch();

  const load = useAppSelector(selectCurrentLoad);
  const loading = useAppSelector(selectLoadsLoading);
  const bids = useAppSelector(selectLoadBids);
  const userRole = useAppSelector(selectUserRole);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(fetchLoadById(loadId));
    dispatch(fetchLoadBids(loadId));
  }, [loadId]);

  const handleBid = () => {
    navigation.navigate('BidScreen', { loadId });
  };

  const handleMessage = () => {
    // Create or open conversation with shipper
    navigation.navigate('ChatScreen', { conversationId: '', participantName: load?.shipper?.companyName });
  };

  const handleSave = () => {
    if (saved) {
      dispatch(unsaveLoad(loadId));
    } else {
      dispatch(saveLoad(loadId));
    }
    setSaved(!saved);
  };

  const handleViewMap = () => {
    navigation.navigate('MapView', { loadId });
  };

  if (loading || !load) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Rate */}
        <View style={styles.heroSection}>
          <View style={styles.rateContainer}>
            <Text style={styles.rate}>${load.rate.toLocaleString()}</Text>
            <Text style={styles.rateLabel}>total payout</Text>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveIcon}>{saved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        {/* Route Card */}
        <View style={styles.card}>
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeCity}>{load.origin.city}, {load.origin.state}</Text>
                <Text style={styles.routeAddress}>{load.origin.address}</Text>
                <Text style={styles.routeDate}>
                  {new Date(load.pickupDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            <View style={styles.routeConnector} />

            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: colors.error }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>DELIVERY</Text>
                <Text style={styles.routeCity}>{load.destination.city}, {load.destination.state}</Text>
                <Text style={styles.routeAddress}>{load.destination.address}</Text>
                <Text style={styles.routeDate}>
                  {new Date(load.deliveryDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          </View>

          {/* Map Preview */}
          <TouchableOpacity style={styles.mapPreview} onPress={handleViewMap}>
            <Text style={styles.mapPlaceholder}>🗺️ Tap to view full map</Text>
          </TouchableOpacity>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailValue}>{load.distance} mi</Text>
            <Text style={styles.detailLabel}>Distance</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailValue}>{(load.weight / 2000).toFixed(1)}k</Text>
            <Text style={styles.detailLabel}>Weight (lbs)</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailValue}>{load.equipmentType.replace('_', ' ')}</Text>
            <Text style={styles.detailLabel}>Equipment</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailValue}>${Math.round(load.rate / load.distance)}</Text>
            <Text style={styles.detailLabel}>Per mile</Text>
          </View>
        </View>

        {/* Cargo Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cargo Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Commodity</Text>
            <Text style={styles.infoValue}>{load.commodity || 'General Freight'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pallets</Text>
            <Text style={styles.infoValue}>{load.palletCount || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dimensions</Text>
            <Text style={styles.infoValue}>
              {load.length ? `${load.length}' × ${load.width || '8'}' × ${load.height || '8'}'` : 'Standard'}
            </Text>
          </View>
          {load.requiresTarping && (
            <View style={[styles.infoRow, styles.lastRow]}>
              <Text style={styles.infoLabel}>Tarping</Text>
              <Text style={[styles.infoValue, { color: colors.warning }]}>Required</Text>
            </View>
          )}
          {load.hazmat && (
            <View style={[styles.infoRow, styles.lastRow]}>
              <Text style={styles.infoLabel}>Hazmat</Text>
              <Text style={[styles.infoValue, { color: colors.error }]}>Yes - Class {load.hazmatClass}</Text>
            </View>
          )}
          {load.temperature && (
            <View style={[styles.infoRow, styles.lastRow]}>
              <Text style={styles.infoLabel}>Temperature</Text>
              <Text style={[styles.infoValue, { color: colors.info }]}>{load.temperature}°F</Text>
            </View>
          )}
        </View>

        {/* Shipper Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Posted By</Text>
          <View style={styles.shipperRow}>
            <View style={styles.shipperAvatar}>
              <Text style={styles.shipperInitial}>
                {(load.shipper?.companyName || 'S')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.shipperInfo}>
              <Text style={styles.shipperName}>{load.shipper?.companyName || 'Verified Shipper'}</Text>
              <Text style={styles.shipperRating}>
                ⭐ {load.shipper?.rating || '4.8'} ({load.shipper?.reviewCount || '120'} reviews)
              </Text>
            </View>
            <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bidding Activity (for shippers) */}
        {userRole === 'shipper' && bids.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bids ({bids.length})</Text>
            {bids.slice(0, 3).map((bid) => (
              <View key={bid.id} style={styles.bidRow}>
                <Text style={styles.bidCarrier}>{bid.carrier?.companyName || 'Carrier'}</Text>
                <Text style={styles.bidAmount}>${bid.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      {userRole === 'carrier' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleMessage}>
            <Text style={styles.secondaryButtonText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleBid}>
            <Text style={styles.primaryButtonText}>Place Bid</Text>
          </TouchableOpacity>
        </View>
      )}

      {userRole === 'shipper' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>View All Bids ({bids.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scrollView: { flex: 1 },

  heroSection: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20, backgroundColor: colors.primary,
  },
  rateContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  rate: { fontSize: 36, fontWeight: '800', color: colors.white },
  rateLabel: { fontSize: 14, color: colors.white + '80' },
  saveButton: { padding: 8 },

  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginVertical: 8, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },

  routeContainer: { padding: 4 },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start' },
  routeDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4, marginRight: 12 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', marginBottom: 2 },
  routeCity: { fontSize: 18, fontWeight: '600', color: colors.text },
  routeAddress: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  routeDate: { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: '600' },
  routeConnector: { width: 2, height: 24, backgroundColor: colors.border, marginLeft: 6, marginVertical: 4 },

  mapPreview: {
    height: 120, backgroundColor: colors.gray100, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  mapPlaceholder: { color: colors.textSecondary, fontSize: 14 },

  detailsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginVertical: 8,
  },
  detailCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  detailValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  detailLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  lastRow: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  shipperRow: { flexDirection: 'row', alignItems: 'center' },
  shipperAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  shipperInitial: { fontSize: 20, fontWeight: '700', color: colors.primary },
  shipperInfo: { flex: 1, marginLeft: 12 },
  shipperName: { fontSize: 15, fontWeight: '600', color: colors.text },
  shipperRating: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  contactButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primary + '15',
  },
  contactButtonText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  bidRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  bidCarrier: { fontSize: 14, color: colors.text },
  bidAmount: { fontSize: 14, fontWeight: '700', color: colors.primary },

  bottomBar: {
    flexDirection: 'row', padding: 16, gap: 12,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  primaryButton: {
    flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    flex: 1, height: 52, backgroundColor: colors.surface, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});

export default LoadDetailsScreen;
