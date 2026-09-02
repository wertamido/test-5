/**
 * API Service Layer
 * Centralized API client with interceptors, token refresh, and typed endpoints
 */

import { Platform } from 'react-native';
import { store } from '../store';
import type {
  User,
  Load,
  Bid,
  Trip,
  Payment,
  Payout,
  Message,
  Conversation,
  Notification,
  Document,
  Vehicle,
  Rating,
  Subscription,
  AnalyticsData,
  LocationUpdate,
  LoadSearchParams,
  PaginatedResponse,
} from '@dispatch/shared';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001/socket.io';

// ─── Token Storage ────────────────────────────────────────────────────────────

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (access: string | null, refresh: string | null) => {
  accessToken = access;
  refreshToken = refresh;
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

// ─── HTTP Client ──────────────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  skipRefresh?: boolean;
}

class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, skipRefresh = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client': `mobile-${Platform.OS}`,
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (requiresAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Handle token expiration
  if (response.status === 401 && !skipRefresh && refreshToken) {
    try {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request
        headers.Authorization = `Bearer ${accessToken}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...fetchOptions,
          headers,
        });
      }
    } catch {
      // Refresh failed — redirect to login
      store.dispatch({ type: 'auth/logout/fulfilled' });
      throw new ApiError('Session expired', 401);
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || `Request failed with status ${response.status}`,
      response.status,
      data.code,
      data.details
    );
  }

  return data;
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      // Don't use request() to avoid infinite loop
    });

    if (!response.ok) return false;

    const data = await response.json();
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    store.dispatch({
      type: 'auth/setCredentials',
      payload: {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── API Modules ──────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: any) =>
    request<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data), requiresAuth: false }
    ),

  login: (data: { email: string; password: string }) =>
    request<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data), requiresAuth: false }
    ),

  logout: (token: string) =>
    request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
      requiresAuth: false,
      skipRefresh: true,
    }),

  refresh: (token: string) =>
    request<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: token }),
        requiresAuth: false,
        skipRefresh: true,
      }
    ),

  getProfile: () => request<User>('/users/me'),

  updateProfile: (data: Partial<User>) =>
    request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      requiresAuth: false,
    }),

  resetPassword: (data: { token: string; newPassword: string }) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: false,
    }),

  verifyEmail: (token: string) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
      requiresAuth: false,
    }),

  resendVerification: () =>
    request('/auth/resend-verification', { method: 'POST' }),

  verifyPhone: (code: string) =>
    request('/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  setup2FA: () => request<{ qrCode: string; secret: string }>('/auth/2fa/setup'),

  verify2FA: (code: string) =>
    request('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  disable2FA: (code: string) =>
    request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

export const loadsApi = {
  search: (params: LoadSearchParams & { page?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    return request<{ data: Load[]; page: number; hasMore: boolean }>(
      `/loads?${query.toString()}`
    );
  },

  getById: (id: string) => request<Load>(`/loads/${id}`),

  create: (data: Partial<Load>) =>
    request<Load>('/loads', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Load>) =>
    request<Load>(`/loads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) => request(`/loads/${id}`, { method: 'DELETE' }),

  assign: (id: string, carrierId: string) =>
    request<Load>(`/loads/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ carrierId }),
    }),

  save: (id: string) =>
    request(`/loads/${id}/save`, { method: 'POST' }),

  unsave: (id: string) =>
    request(`/loads/${id}/save`, { method: 'DELETE' }),

  getSaved: () =>
    request<{ data: Load[] }>('/loads/saved'),

  getNearby: (params: { latitude: number; longitude: number; radius?: number }) => {
    const query = new URLSearchParams(params as any);
    return request<{ data: Load[] }>(`/loads/nearby?${query.toString()}`);
  },

  getMyLoads: (params: { status?: string } = {}) => {
    const query = new URLSearchParams(params as any);
    return request<{ data: Load[] }>(`/loads/my?${query.toString()}`);
  },
};

export const bidsApi = {
  getByLoad: (loadId: string) =>
    request<{ data: Bid[] }>(`/bids/load/${loadId}`),

  getMyBids: (params: { status?: string } = {}) => {
    const query = new URLSearchParams(params as any);
    return request<{ data: Bid[] }>(`/bids/my?${query.toString()}`);
  },

  create: (data: { loadId: string; amount: number; message?: string }) =>
    request<Bid>('/bids', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Bid>) =>
    request<Bid>(`/bids/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  accept: (id: string) =>
    request<Bid>(`/bids/${id}/accept`, { method: 'POST' }),

  reject: (id: string) =>
    request<Bid>(`/bids/${id}/reject`, { method: 'POST' }),

  counter: (id: string, amount: number) =>
    request<Bid>(`/bids/${id}/counter`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  withdraw: (id: string) =>
    request<Bid>(`/bids/${id}/withdraw`, { method: 'POST' }),

  getStats: () => request('/bids/stats'),
};

export const tripsApi = {
  search: (params: { status?: string; page?: number } = {}) => {
    const query = new URLSearchParams(params as any);
    return request<{ data: Trip[] }>(`/trips?${query.toString()}`);
  },

  getById: (id: string) => request<Trip>(`/trips/${id}`),

  updateStatus: (id: string, status: string) =>
    request<Trip>(`/trips/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  recordPickup: (id: string, notes?: string) =>
    request<Trip>(`/trips/${id}/pickup`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  recordDelivery: (id: string, notes?: string) =>
    request<Trip>(`/trips/${id}/deliver`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  uploadBOL: (id: string, file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<Trip>(`/trips/${id}/bol`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let fetch set content-type for FormData
    });
  },

  uploadPOD: (id: string, file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<Trip>(`/trips/${id}/pod`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  addExpense: (id: string, data: any) =>
    request(`/trips/${id}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getExpenses: (id: string) => request(`/trips/${id}/expenses`),

  reportIssue: (id: string, data: any) =>
    request(`/trips/${id}/issues`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLocation: (data: {
    tripId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
  }) =>
    request<LocationUpdate>('/tracking/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTimeline: (id: string) => request(`/trips/${id}/timeline`),
};

export const paymentsApi = {
  list: (params: { status?: string; page?: number } = {}) => {
    const query = new URLSearchParams(params as any);
    return request<{ data: Payment[] }>(`/payments?${query.toString()}`);
  },

  createIntent: (data: { tripId: string; amount: number }) =>
    request<Payment>('/payments/intent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirm: (paymentIntentId: string, paymentMethodId: string) =>
    request<Payment>(`/payments/${paymentIntentId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId }),
    }),

  getEscrowStatus: (tripId: string) =>
    request<{ amount: number; status: string }>(`/payments/escrow/${tripId}`),

  releaseEscrow: (tripId: string) =>
    request(`/payments/escrow/${tripId}/release`, { method: 'POST' }),

  getEarnings: (params: { period?: string } = {}) => {
    const query = new URLSearchParams(params as any);
    return request<{
      total: number;
      thisMonth: number;
      thisWeek: number;
      history: Array<{ date: string; amount: number }>;
    }>(`/payments/earnings?${query.toString()}`);
  },

  requestPayout: (data: { amount: number; method: string }) =>
    request<Payout>('/payments/payouts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPayouts: () => request<{ data: Payout[] }>('/payments/payouts'),

  getPaymentMethods: () => request('/payments/methods'),

  addPaymentMethod: (data: any) =>
    request('/payments/methods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePaymentMethod: (id: string) =>
    request(`/payments/methods/${id}`, { method: 'DELETE' }),

  setDefaultPaymentMethod: (id: string) =>
    request(`/payments/methods/${id}/default`, { method: 'POST' }),
};

export const messagesApi = {
  getConversations: () =>
    request<{ data: Conversation[] }>('/messages/conversations'),

  getMessages: (conversationId: string, page = 1) => {
    const query = new URLSearchParams({ page: String(page) });
    return request<{ messages: Message[]; hasMore: boolean }>(
      `/messages/conversations/${conversationId}/messages?${query.toString()}`
    );
  },

  send: (data: { conversationId: string; content: string; type?: string }) =>
    request<Message>('/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createConversation: (data: { participantIds: string[]; loadId?: string }) =>
    request<Conversation>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  markAsRead: (conversationId: string) =>
    request(`/messages/conversations/${conversationId}/read`, { method: 'POST' }),

  deleteMessage: (messageId: string) =>
    request(`/messages/${messageId}`, { method: 'DELETE' }),

  searchMessages: (query: string) =>
    request(`/messages/search?q=${encodeURIComponent(query)}`),
};

export const notificationsApi = {
  list: (params: { unreadOnly?: boolean; limit?: number } = {}) => {
    const query = new URLSearchParams(params as any);
    return request<{ data: Notification[] }>(`/notifications?${query.toString()}`);
  },

  markAsRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: 'POST' }),

  markAllAsRead: () => request('/notifications/read-all', { method: 'POST' }),

  updateSettings: (settings: Record<string, boolean>) =>
    request('/notifications/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),

  getSettings: () => request('/notifications/settings'),
};

export const documentsApi = {
  list: (params: { type?: string } = {}) => {
    const query = new URLSearchParams(params as any);
    return request<{ data: Document[] }>(`/documents?${query.toString()}`);
  },

  getById: (id: string) => request<Document>(`/documents/${id}`),

  upload: (data: { file: any; type: string; metadata?: any }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('type', data.type);
    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }
    return request<Document>('/documents', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  delete: (id: string) => request(`/documents/${id}`, { method: 'DELETE' }),

  verify: (id: string, notes?: string) =>
    request(`/documents/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  reject: (id: string, reason: string) =>
    request(`/documents/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export const vehiclesApi = {
  list: () => request<{ data: Vehicle[] }>('/vehicles'),

  getById: (id: string) => request<Vehicle>(`/vehicles/${id}`),

  create: (data: Partial<Vehicle>) =>
    request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Vehicle>) =>
    request<Vehicle>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) => request(`/vehicles/${id}`, { method: 'DELETE' }),

  addMaintenance: (id: string, data: any) =>
    request<Vehicle>(`/vehicles/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMaintenance: (id: string) =>
    request(`/vehicles/${id}/maintenance`),
};

export const trackingApi = {
  updateLocation: (data: {
    tripId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
  }) =>
    request<LocationUpdate>('/tracking/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: (params: { tripId: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as any);
    return request<{ data: LocationUpdate[] }>(
      `/tracking/history?${query.toString()}`
    );
  },

  getLive: (tripId: string) =>
    request<LocationUpdate>(`/tracking/${tripId}/live`),

  getActiveTrips: () => request<{ data: Trip[] }>('/tracking/active'),

  getFleetView: () => request('/tracking/fleet'),

  createGeofence: (data: any) =>
    request('/tracking/geofences', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteGeofence: (id: string) =>
    request(`/tracking/geofences/${id}`, { method: 'DELETE' }),
};

export const ratingsApi = {
  create: (data: {
    tripId: string;
    ratedUserId: string;
    rating: number;
    comment?: string;
  }) => request('/ratings', { method: 'POST', body: JSON.stringify(data) }),

  getForUser: (userId: string) =>
    request(`/ratings/user/${userId}`),

  getForTrip: (tripId: string) =>
    request(`/ratings/trip/${tripId}`),

  getMyReceived: () => request('/ratings/received'),

  getMyGiven: () => request('/ratings/given'),
};

export const subscriptionApi = {
  getPlans: () => request('/subscriptions/plans'),

  getCurrent: () => request('/subscriptions/current'),

  subscribe: (data: { planId: string; paymentMethodId?: string }) =>
    request('/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  upgrade: (planId: string) =>
    request('/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  cancel: (reason?: string) =>
    request('/subscriptions/cancel', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getInvoices: () => request('/subscriptions/invoices'),

  getLimits: () => request('/subscriptions/limits'),
};

export const analyticsApi = {
  getDashboard: () => request('/analytics/dashboard'),

  getEarnings: (params: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as any);
    return request(`/analytics/earnings?${query.toString()}`);
  },

  getPerformance: () => request('/analytics/performance'),

  getLoadStats: () => request('/analytics/loads'),

  getRevenue: (params: { period?: string } = {}) => {
    const query = new URLSearchParams(params as any);
    return request(`/analytics/revenue?${query.toString()}`);
  },
};

export const searchApi = {
  advanced: (params: any) => {
    const query = new URLSearchParams(params);
    return request(`/search/advanced?${query.toString()}`);
  },

  truckers: (params: any) => {
    const query = new URLSearchParams(params);
    return request(`/search/truckers?${query.toString()}`);
  },

  suggestions: (q: string) =>
    request(`/search/suggestions?q=${encodeURIComponent(q)}`),
};

export const uploadApi = {
  single: (file: any, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return request('/upload', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  multiple: (files: any[], type: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('type', type);
    return request('/upload/multiple', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  avatar: (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload/avatar', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },
};

// ─── WebSocket / Socket.IO Client ────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('[Socket] Error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emitSocket = (event: string, data: any) => {
  if (socket?.connected) {
    socket.emit(event, data);
  }
};

export const onSocket = (event: string, handler: (...args: any[]) => void) => {
  if (socket) {
    socket.on(event, handler);
  }
};

export const offSocket = (event: string) => {
  if (socket) {
    socket.off(event);
  }
};

// ─── Export ───────────────────────────────────────────────────────────────────

export { ApiError };
export default {
  auth: authApi,
  loads: loadsApi,
  bids: bidsApi,
  trips: tripsApi,
  payments: paymentsApi,
  messages: messagesApi,
  notifications: notificationsApi,
  documents: documentsApi,
  vehicles: vehiclesApi,
  tracking: trackingApi,
  ratings: ratingsApi,
  subscription: subscriptionApi,
  analytics: analyticsApi,
  search: searchApi,
  upload: uploadApi,
};
