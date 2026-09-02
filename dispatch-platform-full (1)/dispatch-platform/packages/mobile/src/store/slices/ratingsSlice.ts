import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { ratingsApi } from '../../services/api';
import type { Rating } from '@dispatch/shared';

interface RatingsState {
  ratings: Rating[];
  loading: boolean;
  error: string | null;
}

const initialState: RatingsState = {
  ratings: [],
  loading: false,
  error: null,
};

export const createRating = createAsyncThunk(
  'ratings/createRating',
  async (
    data: { tripId: string; ratedUserId: string; rating: number; comment?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await ratingsApi.create(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create rating');
    }
  }
);

export const fetchUserRatings = createAsyncThunk(
  'ratings/fetchUserRatings',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await ratingsApi.getForUser(userId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch ratings');
    }
  }
);

const ratingsSlice = createSlice({
  name: 'ratings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRating.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRating.fulfilled, (state, action) => {
        state.loading = false;
        state.ratings = [action.payload, ...state.ratings];
      })
      .addCase(createRating.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchUserRatings.fulfilled, (state, action) => {
        state.ratings = action.payload.data || action.payload;
      })
      .addCase(fetchUserRatings.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = ratingsSlice.actions;
export const selectRatings = (state: any) => state.ratings.ratings;
export const selectRatingsLoading = (state: any) => state.ratings.loading;
export const selectRatingsError = (state: any) => state.ratings.error;

export default ratingsSlice.reducer;
