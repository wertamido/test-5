import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { vehiclesApi } from '../../services/api';
import type { Vehicle } from '@dispatch/shared';

interface VehiclesState {
  vehicles: Vehicle[];
  currentVehicle: Vehicle | null;
  loading: boolean;
  error: string | null;
}

const initialState: VehiclesState = {
  vehicles: [],
  currentVehicle: null,
  loading: false,
  error: null,
};

export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await vehiclesApi.list();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch vehicles');
    }
  }
);

export const fetchVehicleById = createAsyncThunk(
  'vehicles/fetchVehicleById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await vehiclesApi.getById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch vehicle');
    }
  }
);

export const createVehicle = createAsyncThunk(
  'vehicles/createVehicle',
  async (data: Partial<Vehicle>, { rejectWithValue }) => {
    try {
      const response = await vehiclesApi.create(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create vehicle');
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async (
    { id, data }: { id: string; data: Partial<Vehicle> },
    { rejectWithValue }
  ) => {
    try {
      const response = await vehiclesApi.update(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update vehicle');
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (id: string, { rejectWithValue }) => {
    try {
      await vehiclesApi.delete(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete vehicle');
    }
  }
);

export const addMaintenanceRecord = createAsyncThunk(
  'vehicles/addMaintenance',
  async (
    { id, data }: { id: string; data: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await vehiclesApi.addMaintenance(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add maintenance record');
    }
  }
);

const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    setCurrentVehicle: (state, action: PayloadAction<Vehicle | null>) => {
      state.currentVehicle = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = action.payload.data || action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchVehicleById.fulfilled, (state, action) => {
        state.currentVehicle = action.payload;
      })
      .addCase(fetchVehicleById.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.vehicles = [action.payload, ...state.vehicles];
      })
      .addCase(createVehicle.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const idx = state.vehicles.findIndex(
          (v) => v.id === action.payload.id
        );
        if (idx !== -1) state.vehicles[idx] = action.payload;
        if (state.currentVehicle?.id === action.payload.id) {
          state.currentVehicle = action.payload;
        }
      })
      .addCase(updateVehicle.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter((v) => v.id !== action.payload);
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(addMaintenanceRecord.fulfilled, (state, action) => {
        const idx = state.vehicles.findIndex(
          (v) => v.id === action.payload.id
        );
        if (idx !== -1) state.vehicles[idx] = action.payload;
        if (state.currentVehicle?.id === action.payload.id) {
          state.currentVehicle = action.payload;
        }
      })
      .addCase(addMaintenanceRecord.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentVehicle, clearError } = vehiclesSlice.actions;

export const selectVehicles = (state: any) => state.vehicles.vehicles;
export const selectCurrentVehicle = (state: any) =>
  state.vehicles.currentVehicle;
export const selectVehiclesLoading = (state: any) => state.vehicles.loading;
export const selectVehiclesError = (state: any) => state.vehicles.error;

export default vehiclesSlice.reducer;
