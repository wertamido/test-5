import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { tripsApi } from '../../services/api';
import type { Trip, TripStatus } from '@dispatch/shared';

interface TripsState {
  trips: Trip[];
  currentTrip: Trip | null;
  activeTrip: Trip | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: TripStatus;
    role?: 'shipper' | 'carrier';
  };
}

const initialState: TripsState = {
  trips: [],
  currentTrip: null,
  activeTrip: null,
  loading: false,
  error: null,
  filters: {},
};

export const fetchTrips = createAsyncThunk(
  'trips/fetchTrips',
  async (
    params: { status?: TripStatus; page?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await tripsApi.search(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch trips');
    }
  }
);

export const fetchTripById = createAsyncThunk(
  'trips/fetchTripById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await tripsApi.getById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch trip');
    }
  }
);

export const updateTripStatus = createAsyncThunk(
  'trips/updateStatus',
  async (
    { id, status }: { id: string; status: TripStatus },
    { rejectWithValue }
  ) => {
    try {
      const response = await tripsApi.updateStatus(id, status);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update trip status');
    }
  }
);

export const recordPickup = createAsyncThunk(
  'trips/recordPickup',
  async (
    { id, notes }: { id: string; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await tripsApi.recordPickup(id, notes);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to record pickup');
    }
  }
);

export const recordDelivery = createAsyncThunk(
  'trips/recordDelivery',
  async (
    { id, notes }: { id: string; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await tripsApi.recordDelivery(id, notes);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to record delivery');
    }
  }
);

export const updateLocation = createAsyncThunk(
  'trips/updateLocation',
  async (
    {
      tripId,
      latitude,
      longitude,
      speed,
      heading,
    }: {
      tripId: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await tripsApi.updateLocation({
        tripId,
        latitude,
        longitude,
        speed,
        heading,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update location');
    }
  }
);

const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setCurrentTrip: (state, action: PayloadAction<Trip | null>) => {
      state.currentTrip = action.payload;
    },
    setActiveTrip: (state, action: PayloadAction<Trip | null>) => {
      state.activeTrip = action.payload;
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<TripsState['filters']>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    updateTripInList: (state, action: PayloadAction<Trip>) => {
      const index = state.trips.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.trips[index] = action.payload;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = action.payload.data || action.payload;
        // Set active trip if any is in progress
        const active = state.trips.find(
          (t) =>
            t.status === 'in_transit' ||
            t.status === 'loaded' ||
            t.status === 'at_pickup'
        );
        if (active) state.activeTrip = active;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchTripById.fulfilled, (state, action) => {
        state.currentTrip = action.payload;
      })
      .addCase(fetchTripById.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(updateTripStatus.fulfilled, (state, action) => {
        const index = state.trips.findIndex(
          (t) => t.id === action.payload.id
        );
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
        if (state.currentTrip?.id === action.payload.id) {
          state.currentTrip = action.payload;
        }
      })
      .addCase(updateTripStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(recordPickup.fulfilled, (state, action) => {
        const index = state.trips.findIndex(
          (t) => t.id === action.payload.id
        );
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
        if (state.currentTrip?.id === action.payload.id) {
          state.currentTrip = action.payload;
        }
      })
      .addCase(recordPickup.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(recordDelivery.fulfilled, (state, action) => {
        const index = state.trips.findIndex(
          (t) => t.id === action.payload.id
        );
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
        if (state.currentTrip?.id === action.payload.id) {
          state.currentTrip = action.payload;
        }
        // Clear active trip if delivered
        if (action.payload.status === 'delivered') {
          state.activeTrip = null;
        }
      })
      .addCase(recordDelivery.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(updateLocation.fulfilled, (state, action) => {
        // Update location in current trip if it matches
        if (state.currentTrip?.id === action.payload.tripId) {
          state.currentTrip.currentLocation = action.payload;
        }
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentTrip,
  setActiveTrip,
  setFilters,
  updateTripInList,
  clearError,
} = tripsSlice.actions;

export const selectTrips = (state: any) => state.trips.trips;
export const selectCurrentTrip = (state: any) => state.trips.currentTrip;
export const selectActiveTrip = (state: any) => state.trips.activeTrip;
export const selectTripsLoading = (state: any) => state.trips.loading;
export const selectTripsError = (state: any) => state.trips.error;

export default tripsSlice.reducer;
