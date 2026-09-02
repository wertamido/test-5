import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { trackingApi } from '../../services/api';
import type { LocationUpdate, Trip } from '@dispatch/shared';

interface TrackingState {
  currentLocation: LocationUpdate | null;
  locationHistory: LocationUpdate[];
  activeTrips: Trip[];
  isTracking: boolean;
  trackingInterval: number; // seconds
  geofences: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // meters
  }>;
  loading: boolean;
  error: string | null;
}

const initialState: TrackingState = {
  currentLocation: null,
  locationHistory: [],
  activeTrips: [],
  isTracking: false,
  trackingInterval: 30,
  geofences: [],
  loading: false,
  error: null,
};

export const startTracking = createAsyncThunk(
  'tracking/startTracking',
  async (tripId: string, { rejectWithValue, dispatch }) => {
    try {
      // Start sending location updates
      dispatch(setIsTracking(true));
      return tripId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to start tracking');
    }
  }
);

export const stopTracking = createAsyncThunk(
  'tracking/stopTracking',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setIsTracking(false));
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to stop tracking');
    }
  }
);

export const updateLocation = createAsyncThunk(
  'tracking/updateLocation',
  async (
    data: {
      tripId: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await trackingApi.updateLocation(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update location');
    }
  }
);

export const fetchLocationHistory = createAsyncThunk(
  'tracking/fetchHistory',
  async (
    params: { tripId: string; startDate?: string; endDate?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await trackingApi.getHistory(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch location history');
    }
  }
);

export const fetchActiveTrips = createAsyncThunk(
  'tracking/fetchActiveTrips',
  async (_, { rejectWithValue }) => {
    try {
      const response = await trackingApi.getActiveTrips();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch active trips');
    }
  }
);

const trackingSlice = createSlice({
  name: 'tracking',
  initialState,
  reducers: {
    setIsTracking: (state, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;
    },
    setCurrentLocation: (state, action: PayloadAction<LocationUpdate>) => {
      state.currentLocation = action.payload;
      state.locationHistory = [...state.locationHistory, action.payload].slice(
        -1000
      ); // Keep last 1000 points
    },
    setLocationHistory: (state, action: PayloadAction<LocationUpdate[]>) => {
      state.locationHistory = action.payload;
    },
    setTrackingInterval: (state, action: PayloadAction<number>) => {
      state.trackingInterval = action.payload;
    },
    addGeofence: (
      state,
      action: PayloadAction<TrackingState['geofences'][0]>
    ) => {
      state.geofences.push(action.payload);
    },
    removeGeofence: (state, action: PayloadAction<string>) => {
      state.geofences = state.geofences.filter((g) => g.id !== action.payload);
    },
    clearHistory: (state) => {
      state.locationHistory = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startTracking.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(updateLocation.fulfilled, (state, action) => {
        state.currentLocation = action.payload;
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchLocationHistory.fulfilled, (state, action) => {
        state.locationHistory = action.payload.data || action.payload;
      })
      .addCase(fetchLocationHistory.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchActiveTrips.fulfilled, (state, action) => {
        state.activeTrips = action.payload.data || action.payload;
      })
      .addCase(fetchActiveTrips.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setIsTracking,
  setCurrentLocation,
  setLocationHistory,
  setTrackingInterval,
  addGeofence,
  removeGeofence,
  clearHistory,
  clearError,
} = trackingSlice.actions;

export const selectCurrentLocation = (state: any) =>
  state.tracking.currentLocation;
export const selectLocationHistory = (state: any) =>
  state.tracking.locationHistory;
export const selectActiveTrips = (state: any) => state.tracking.activeTrips;
export const selectIsTracking = (state: any) => state.tracking.isTracking;
export const selectTrackingInterval = (state: any) =>
  state.tracking.trackingInterval;
export const selectGeofences = (state: any) => state.tracking.geofences;
export const selectTrackingError = (state: any) => state.tracking.error;

export default trackingSlice.reducer;
