/**
 * Location Service — GPS tracking with background support
 * Handles: foreground/background location updates, geofencing, HOS tracking
 */

import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { store } from '../store';
import { selectTrackingInterval } from '../store/slices/trackingSlice';
import { selectActiveTrip } from '../store/slices/tripsSlice';
import { emitLocation } from './socketService';
import { ApiError } from './api';

let watchId: number | null = null;
let isTracking = false;

// ─── Permissions ──────────────────────────────────────────────────────────────

export const requestLocationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled in Info.plist
    // NSLocationWhenInUseUsageDescription
    // NSLocationAlwaysUsageDescription
    // NSLocationAlwaysAndWhenInUseUsageDescription
    return true;
  }

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      return (
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('[LocationService] Permission error:', error);
      return false;
    }
  }

  return false;
};

// ─── Get Current Position ────────────────────────────────────────────────────

export const getCurrentPosition = (): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
}> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
        });
      },
      (error) => {
        console.error('[LocationService] Get current position error:', error);
        reject(new ApiError(error.message, error.code));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );
  });
};

// ─── Start Tracking ───────────────────────────────────────────────────────────

export const startTracking = async (): Promise<void> => {
  if (isTracking) {
    console.log('[LocationService] Already tracking');
    return;
  }

  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) {
    throw new ApiError('Location permission denied', 403);
  }

  const state = store.getState();
  const activeTrip = selectActiveTrip(state);
  const interval = selectTrackingInterval(state) * 1000; // Convert to ms

  if (!activeTrip) {
    console.log('[LocationService] No active trip — tracking anyway');
  }

  isTracking = true;

  // Get initial position
  try {
    const pos = await getCurrentPosition();
    store.dispatch({
      type: 'tracking/setCurrentLocation',
      payload: {
        latitude: pos.latitude,
        longitude: pos.longitude,
        speed: pos.speed || undefined,
        heading: pos.heading || undefined,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[LocationService] Initial position error:', error);
  }

  // Start watching position
  watchId = Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed, heading, accuracy } = position.coords;

      const locationData = {
        latitude,
        longitude,
        accuracy,
        speed: speed || undefined,
        heading: heading || undefined,
        timestamp: new Date().toISOString(),
      };

      // Update Redux store
      store.dispatch({
        type: 'tracking/setCurrentLocation',
        payload: locationData,
      });

      // Emit via WebSocket (real-time)
      if (activeTrip) {
        emitLocation({
          tripId: activeTrip.id,
          latitude,
          longitude,
          speed: speed || undefined,
          heading: heading || undefined,
        });
      }
    },
    (error) => {
      console.error('[LocationService] Watch error:', error);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10, // Update every 10 meters
      interval: interval, // Min time between updates (Android)
      fastestInterval: Math.min(interval, 10000), // Fastest update interval
      forceRequestLocation: true,
      showLocationDialog: true,
      useSignificantChanges: Platform.OS === 'ios',
    }
  );

  console.log('[LocationService] Started tracking, watchId:', watchId);
};

// ─── Stop Tracking ───────────────────────────────────────────────────────────

export const stopTracking = (): void => {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  isTracking = false;
  store.dispatch({ type: 'tracking/setIsTracking', payload: false });
  console.log('[LocationService] Stopped tracking');
};

// ─── Check Geofence ─────────────────────────────────────────────────────────

export const isWithinGeofence = (
  currentLat: number,
  currentLng: number,
  geofenceLat: number,
  geofenceLng: number,
  radiusMeters: number
): boolean => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((geofenceLat - currentLat) * Math.PI) / 180;
  const dLng = ((geofenceLng - currentLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((currentLat * Math.PI) / 180) *
      Math.cos((geofenceLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= radiusMeters;
};

// ─── Calculate Distance ──────────────────────────────────────────────────────

export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ─── Calculate ETA ───────────────────────────────────────────────────────────

export const calculateETA = (
  currentLat: number,
  currentLng: number,
  destLat: number,
  destLng: number,
  averageSpeedKmh = 80
): Date => {
  const distance = calculateDistance(
    currentLat,
    currentLng,
    destLat,
    destLng
  );
  const hours = distance / averageSpeedKmh;
  const eta = new Date(Date.now() + hours * 60 * 60 * 1000);
  return eta;
};

// ─── Getters ─────────────────────────────────────────────────────────────────

export const isCurrentlyTracking = () => isTracking;

export default {
  requestLocationPermissions,
  getCurrentPosition,
  startTracking,
  stopTracking,
  isWithinGeofence,
  calculateDistance,
  calculateETA,
  isCurrentlyTracking,
};
