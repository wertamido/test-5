import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCurrentTrip } from '../../store/slices/tripsSlice';
import { selectCurrentLoad } from '../../store/slices/loadsSlice';
import { lightColors as colors } from '../../theme';

const { width, height } = Dimensions.get('window');

interface MapCoordinate {
  latitude: number;
  longitude: number;
}

const MapViewScreen = ({ route, navigation }: any) => {
  const { loadId, tripId } = route.params || {};
  const dispatch = useAppDispatch();
  const currentTrip = useAppSelector(selectCurrentTrip);
  const currentLoad = useAppSelector(selectCurrentLoad);

  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: 43.6532,
    longitude: -79.3832,
    latitudeDelta: 5,
    longitudeDelta: 5,
  });

  // Mock coordinates for demo — in production, fetch from API
  const origin: MapCoordinate = { latitude: 45.5017, longitude: -73.5673 }; // Montreal
  const destination: MapCoordinate = { latitude: 43.6532, longitude: -79.3832 }; // Toronto
  const driverLocation: MapCoordinate = { latitude: 44.5, longitude: -76.0 }; // En route

  const routeCoordinates: MapCoordinate[] = [origin, driverLocation, destination];

  useEffect(() => {
    // Fit map to show entire route
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        followsUserLocation={false}
      >
        {/* Origin Marker */}
        <Marker
          coordinate={origin}
          title="Pickup"
          description="Origin"
          pinColor="green"
        />

        {/* Destination Marker */}
        <Marker
          coordinate={destination}
          title="Delivery"
          description="Destination"
          pinColor="red"
        />

        {/* Driver Location */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="Driver"
            description="Current location"
          >
            <View style={styles.driverMarker}>
              <Text style={styles.driverEmoji}>🚛</Text>
            </View>
          </Marker>
        )}

        {/* Route Line */}
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={colors.primary}
          strokeWidth={4}
          lineDashPattern={[1]}
        />
      </MapView>

      {/* Bottom Info Card */}
      <View style={styles.bottomCard}>
        <View style={styles.routeInfo}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeValue}>Montreal, QC</Text>
            </View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: colors.error }]} />
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>DELIVERY</Text>
              <Text style={styles.routeValue}>Toronto, ON</Text>
            </View>
          </View>
        </View>

        {/* Trip Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>342 mi</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>65%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>2h 15m</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📍</Text>
            <Text style={styles.actionText}>Recenter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔊</Text>
            <Text style={styles.actionText}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  map: { width: width, height: height * 0.6 },

  driverMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  driverEmoji: { fontSize: 20 },

  bottomCard: {
    flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },

  routeInfo: { marginBottom: 20 },
  routePoint: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  routeText: { flex: 1 },
  routeLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  routeValue: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 2 },
  routeDivider: { width: 2, height: 16, backgroundColor: colors.border, marginLeft: 5, marginVertical: 2 },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.divider,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  actionButton: { alignItems: 'center', padding: 8 },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
});

export default MapViewScreen;
