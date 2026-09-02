import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { paymentsApi } from '../../services/api';
import type { Payment, Payout, EscrowStatus } from '@dispatch/shared';

interface PaymentsState {
  payments: Payment[];
  payouts: Payout[];
  escrowBalance: number;
  availableBalance: number;
  pendingBalance: number;
  earnings: {
    total: number;
    thisMonth: number;
    thisWeek: number;
    history: Array<{ date: string; amount: number }>;
  };
  loading: boolean;
  error: string | null;
}

const initialState: PaymentsState = {
  payments: [],
  payouts: [],
  escrowBalance: 0,
  availableBalance: 0,
  pendingBalance: 0,
  earnings: {
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    history: [],
  },
  loading: false,
  error: null,
};

export const fetchPayments = createAsyncThunk(
  'payments/fetchPayments',
  async (
    params: { status?: string; page?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await paymentsApi.list(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch payments');
    }
  }
);

export const createPaymentIntent = createAsyncThunk(
  'payments/createIntent',
  async (
    data: { tripId: string; amount: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await paymentsApi.createIntent(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create payment intent');
    }
  }
);

export const confirmPayment = createAsyncThunk(
  'payments/confirmPayment',
  async (
    { paymentIntentId, paymentMethodId }: { paymentIntentId: string; paymentMethodId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await paymentsApi.confirm(paymentIntentId, paymentMethodId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to confirm payment');
    }
  }
);

export const fetchEscrowStatus = createAsyncThunk(
  'payments/fetchEscrowStatus',
  async (tripId: string, { rejectWithValue }) => {
    try {
      const response = await paymentsApi.getEscrowStatus(tripId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch escrow status');
    }
  }
);

export const releaseEscrow = createAsyncThunk(
  'payments/releaseEscrow',
  async (tripId: string, { rejectWithValue }) => {
    try {
      const response = await paymentsApi.releaseEscrow(tripId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to release escrow');
    }
  }
);

export const fetchEarnings = createAsyncThunk(
  'payments/fetchEarnings',
  async (
    params: { period?: 'week' | 'month' | 'year' } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await paymentsApi.getEarnings(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch earnings');
    }
  }
);

export const requestPayout = createAsyncThunk(
  'payments/requestPayout',
  async (
    data: { amount: number; method: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await paymentsApi.requestPayout(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to request payout');
    }
  }
);

export const fetchPayouts = createAsyncThunk(
  'payments/fetchPayouts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await paymentsApi.getPayouts();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch payouts');
    }
  }
);

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setEscrowBalance: (state, action: PayloadAction<number>) => {
      state.escrowBalance = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.payments = action.payload.data || action.payload;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(createPaymentIntent.fulfilled, (state, action) => {
        state.payments = [action.payload, ...state.payments];
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(confirmPayment.fulfilled, (state, action) => {
        const idx = state.payments.findIndex(
          (p) => p.id === action.payload.id
        );
        if (idx !== -1) state.payments[idx] = action.payload;
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchEscrowStatus.fulfilled, (state, action) => {
        state.escrowBalance = action.payload.amount || 0;
        state.escrowStatus = action.payload.status;
      })
      .addCase(fetchEscrowStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(releaseEscrow.fulfilled, (state, action) => {
        state.escrowBalance = 0;
        state.escrowStatus = 'released';
      })
      .addCase(releaseEscrow.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchEarnings.fulfilled, (state, action) => {
        const data = action.payload;
        state.earnings = {
          total: data.total || 0,
          thisMonth: data.thisMonth || 0,
          thisWeek: data.thisWeek || 0,
          history: data.history || [],
        };
      })
      .addCase(fetchEarnings.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(requestPayout.fulfilled, (state, action) => {
        state.payouts = [action.payload, ...state.payouts];
      })
      .addCase(requestPayout.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchPayouts.fulfilled, (state, action) => {
        state.payouts = action.payload.data || action.payload;
      })
      .addCase(fetchPayouts.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setEscrowBalance, clearError } = paymentsSlice.actions;

export const selectPayments = (state: any) => state.payments.payments;
export const selectPayouts = (state: any) => state.payments.payouts;
export const selectEscrowBalance = (state: any) => state.payments.escrowBalance;
export const selectEscrowStatus = (state: any) => state.payments.escrowStatus;
export const selectEarnings = (state: any) => state.payments.earnings;
export const selectPaymentsLoading = (state: any) => state.payments.loading;
export const selectPaymentsError = (state: any) => state.payments.error;

export default paymentsSlice.reducer;
