import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { bidsApi } from '../../services/api';
import type { Bid, BidStatus } from '@dispatch/shared';

interface BidsState {
  bids: Bid[];
  loadBids: Bid[]; // Bids for a specific load
  myBids: Bid[];   // Current user's bids
  loading: boolean;
  error: string | null;
}

const initialState: BidsState = {
  bids: [],
  loadBids: [],
  myBids: [],
  loading: false,
  error: null,
};

export const fetchLoadBids = createAsyncThunk(
  'bids/fetchLoadBids',
  async (loadId: string, { rejectWithValue }) => {
    try {
      const response = await bidsApi.getByLoad(loadId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch bids');
    }
  }
);

export const fetchMyBids = createAsyncThunk(
  'bids/fetchMyBids',
  async (
    params: { status?: BidStatus } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await bidsApi.getMyBids(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch your bids');
    }
  }
);

export const createBid = createAsyncThunk(
  'bids/createBid',
  async (
    data: { loadId: string; amount: number; message?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await bidsApi.create(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create bid');
    }
  }
);

export const updateBid = createAsyncThunk(
  'bids/updateBid',
  async (
    { id, data }: { id: string; data: Partial<Bid> },
    { rejectWithValue }
  ) => {
    try {
      const response = await bidsApi.update(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update bid');
    }
  }
);

export const acceptBid = createAsyncThunk(
  'bids/acceptBid',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await bidsApi.accept(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to accept bid');
    }
  }
);

export const rejectBid = createAsyncThunk(
  'bids/rejectBid',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await bidsApi.reject(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reject bid');
    }
  }
);

export const withdrawBid = createAsyncThunk(
  'bids/withdrawBid',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await bidsApi.withdraw(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to withdraw bid');
    }
  }
);

const bidsSlice = createSlice({
  name: 'bids',
  initialState,
  reducers: {
    setLoadBids: (state, action: PayloadAction<Bid[]>) => {
      state.loadBids = action.payload;
    },
    clearLoadBids: (state) => {
      state.loadBids = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLoadBids.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLoadBids.fulfilled, (state, action) => {
        state.loading = false;
        state.loadBids = action.payload.data || action.payload;
      })
      .addCase(fetchLoadBids.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchMyBids.fulfilled, (state, action) => {
        state.myBids = action.payload.data || action.payload;
      })
      .addCase(fetchMyBids.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(createBid.fulfilled, (state, action) => {
        state.myBids = [action.payload, ...state.myBids];
        state.loadBids = [action.payload, ...state.loadBids];
      })
      .addCase(createBid.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(updateBid.fulfilled, (state, action) => {
        const updateIn = (list: Bid[]) => {
          const idx = list.findIndex((b) => b.id === action.payload.id);
          if (idx !== -1) list[idx] = action.payload;
        };
        updateIn(state.bids);
        updateIn(state.loadBids);
        updateIn(state.myBids);
      })
      .addCase(updateBid.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(acceptBid.fulfilled, (state, action) => {
        const accepted = action.payload;
        // Mark accepted bid
        const idx = state.loadBids.findIndex((b) => b.id === accepted.id);
        if (idx !== -1) state.loadBids[idx] = accepted;
        // Mark other bids as rejected
        state.loadBids = state.loadBids.map((b) =>
          b.id === accepted.id ? accepted : { ...b, status: 'rejected' as BidStatus }
        );
      })
      .addCase(acceptBid.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(rejectBid.fulfilled, (state, action) => {
        const idx = state.loadBids.findIndex((b) => b.id === action.payload.id);
        if (idx !== -1) state.loadBids[idx] = action.payload;
      })
      .addCase(rejectBid.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(withdrawBid.fulfilled, (state, action) => {
        const idx = state.myBids.findIndex((b) => b.id === action.payload.id);
        if (idx !== -1) state.myBids[idx] = action.payload;
        const idx2 = state.loadBids.findIndex((b) => b.id === action.payload.id);
        if (idx2 !== -1) state.loadBids[idx2] = action.payload;
      })
      .addCase(withdrawBid.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setLoadBids, clearLoadBids, clearError } = bidsSlice.actions;

export const selectBids = (state: any) => state.bids.bids;
export const selectLoadBids = (state: any) => state.bids.loadBids;
export const selectMyBids = (state: any) => state.bids.myBids;
export const selectBidsLoading = (state: any) => state.bids.loading;
export const selectBidsError = (state: any) => state.bids.error;

export default bidsSlice.reducer;
