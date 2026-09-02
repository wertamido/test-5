import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { loadsApi } from '../../services/api';
import type { Load, LoadStatus } from '@dispatch/shared';

interface LoadsState {
  loads: Load[];
  currentLoad: Load | null;
  savedLoads: Load[];
  nearbyLoads: Load[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  filters: {
    status?: LoadStatus;
    minPrice?: number;
    maxPrice?: number;
    origin?: string;
    destination?: string;
    equipmentType?: string;
    sortBy?: 'price' | 'pickupDate' | 'distance';
    sortOrder?: 'asc' | 'desc';
  };
}

const initialState: LoadsState = {
  loads: [],
  currentLoad: null,
  savedLoads: [],
  nearbyLoads: [],
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
  filters: {
    sortBy: 'price',
    sortOrder: 'desc',
  },
};

export const fetchLoads = createAsyncThunk(
  'loads/fetchLoads',
  async (
    params: {
      page?: number;
      status?: LoadStatus;
      origin?: string;
      destination?: string;
      minPrice?: number;
      maxPrice?: number;
      equipmentType?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await loadsApi.search(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch loads');
    }
  }
);

export const fetchLoadById = createAsyncThunk(
  'loads/fetchLoadById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await loadsApi.getById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch load');
    }
  }
);

export const createLoad = createAsyncThunk(
  'loads/createLoad',
  async (
    data: Partial<Load>,
    { rejectWithValue }
  ) => {
    try {
      const response = await loadsApi.create(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create load');
    }
  }
);

export const updateLoad = createAsyncThunk(
  'loads/updateLoad',
  async (
    { id, data }: { id: string; data: Partial<Load> },
    { rejectWithValue }
  ) => {
    try {
      const response = await loadsApi.update(id, data);
      return response;
    } catch (error: any)      return rejectWithValue(error.message || 'Failed to update load');
    }
  }
);

export const deleteLoad = createAsyncThunk(
  'loads/deleteLoad',
  async (id: string, { rejectWithValue }) => {
    try {
      await loadsApi.delete(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete load');
    }
  }
);

export const fetchNearbyLoads = createAsyncThunk(
  'loads/fetchNearbyLoads',
  async (
    params: { latitude: number; longitude: number; radius?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await loadsApi.getNearby(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch nearby loads');
    }
  }
);

export const saveLoad = createAsyncThunk(
  'loads/saveLoad',
  async (id: string, { rejectWithValue }) => {
    try {
      await loadsApi.save(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save load');
    }
  }
);

export const unsaveLoad = createAsyncThunk(
  'loads/unsaveLoad',
  async (id: string, { rejectWithValue }) => {
    try {
      await loadsApi.unsave(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unsave load');
    }
  }
);

export const fetchSavedLoads = createAsyncThunk(
  'loads/fetchSavedLoads',
  async (_, { rejectWithValue }) => {
    try {
      const response = await loadsApi.getSaved();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch saved loads');
    }
  }
);

const loadsSlice = createSlice({
  name: 'loads',
  initialState,
  reducers: {
    setFilters: (
      state,
      action: PayloadAction<Partial<LoadsState['filters']>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
      state.loads = [];
      state.hasMore = true;
    },
    clearFilters: (state) => {
      state.filters = { sortBy: 'price', sortOrder: 'desc' };
      state.page = 1;
      state.loads = [];
      state.hasMore = true;
    },
    setCurrentLoad: (state, action: PayloadAction<Load | null>) => {
      state.currentLoad = action.payload;
    },
    resetLoads: (state) => {
      state.loads = [];
      state.page = 1;
      state.hasMore = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch loads
    builder
      .addCase(fetchLoads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLoads.fulfilled, (state, action) => {
        state.loading = false;
        const { data, page, hasMore } = action.payload;
        if (page === 1) {
          state.loads = data;
        } else {
          state.loads = [...state.loads, ...data];
        }
        state.page = page;
        state.hasMore = hasMore;
      })
      .addCase(fetchLoads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch load by id
    builder
      .addCase(fetchLoadById.fulfilled, (state, action) => {
        state.currentLoad = action.payload;
      })
      .addCase(fetchLoadById.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Create load
    builder
      .addCase(createLoad.fulfilled, (state, action) => {
        state.loads = [action.payload, ...state.loads];
      })
      .addCase(createLoad.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Update load
    builder
      .addCase(updateLoad.fulfilled, (state, action) => {
        const index = state.loads.findIndex(
          (l) => l.id === action.payload.id
        );
        if (index !== -1) {
          state.loads[index] = action.payload;
        }
        if (state.currentLoad?.id === action.payload.id) {
          state.currentLoad = action.payload;
        }
      })
      .addCase(updateLoad.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete load
    builder
      .addCase(deleteLoad.fulfilled, (state, action) => {
        state.loads = state.loads.filter((l) => l.id !== action.payload);
      })
      .addCase(deleteLoad.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Nearby loads
    builder
      .addCase(fetchNearbyLoads.fulfilled, (state, action) => {
        state.nearbyLoads = action.payload.data || action.payload;
      })
      .addCase(fetchNearbyLoads.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Save/unsave
    builder
      .addCase(saveLoad.fulfilled, (state, action) => {
        const load = state.loads.find((l) => l.id === action.payload);
        if (load) {
          state.savedLoads = [...state.savedLoads, load];
        }
      })
      .addCase(unsaveLoad.fulfilled, (state, action) => {
        state.savedLoads = state.savedLoads.filter(
          (l) => l.id !== action.payload
        );
      });

    // Saved loads
    builder
      .addCase(fetchSavedLoads.fulfilled, (state, action) => {
        state.savedLoads = action.payload.data || action.payload;
      })
      .addCase(fetchSavedLoads.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setCurrentLoad,
  resetLoads,
  clearError,
} = loadsSlice.actions;

// Selectors
export const selectLoads = (state: any) => state.loads.loads;
export const selectCurrentLoad = (state: any) => state.loads.currentLoad;
export const selectSavedLoads = (state: any) => state.loads.savedLoads;
export const selectNearbyLoads = (state: any) => state.loads.nearbyLoads;
export const selectLoadsLoading = (state: any) => state.loads.loading;
export const selectLoadsError = (state: any) => state.loads.error;
export const selectLoadsFilters = (state: any) => state.loads.filters;
export const selectHasMoreLoads = (state: any) => state.loads.hasMore;

export default loadsSlice.reducer;
