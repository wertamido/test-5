import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { notificationsApi } from '../../services/api';
import type { Notification, NotificationType } from '@dispatch/shared';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  settings: Record<NotificationType, boolean>;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  settings: {
    new_bid: true,
    bid_accepted: true,
    bid_rejected: true,
    trip_status: true,
    payment: true,
    message: true,
    system: true,
    document_verified: true,
    document_rejected: true,
    dispute_update: true,
  },
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (
    params: { unreadOnly?: boolean; limit?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await notificationsApi.list(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationsApi.markAsRead(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationsApi.markAllAsRead();
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark all as read');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'notifications/updateSettings',
  async (
    settings: Partial<NotificationsState['settings']>,
    { rejectWithValue }
  ) => {
    try {
      const response = await notificationsApi.updateSettings(settings);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update settings');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications = [action.payload, ...state.notifications];
      if (!action.payload.readAt) {
        state.unreadCount += 1;
      }
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    setSettings: (
      state,
      action: PayloadAction<Partial<NotificationsState['settings']>>
    ) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.data || action.payload;
        state.unreadCount = state.notifications.filter((n) => !n.readAt).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(
          (n) => n.id === action.payload
        );
        if (notification && !notification.readAt) {
          notification.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        }));
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings = { ...state.settings, ...action.payload };
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  addNotification,
  setUnreadCount,
  setSettings,
  clearError,
} = notificationsSlice.actions;

export const selectNotifications = (state: any) =>
  state.notifications.notifications;
export const selectUnreadCount = (state: any) =>
  state.notifications.unreadCount;
export const selectNotificationSettings = (state: any) =>
  state.notifications.settings;
export const selectNotificationsLoading = (state: any) =>
  state.notifications.loading;
export const selectNotificationsError = (state: any) =>
  state.notifications.error;

export default notificationsSlice.reducer;
