/**
 * Platform constants and configuration values
 */

// ============================================================================
// PLATFORM CONFIGURATION
// ============================================================================

export const PLATFORM_CONFIG = {
  name: 'FreightConnect',
  version: '1.0.0',
  apiVersion: 'v1',
  supportEmail: 'support@freightconnect.com',
  defaultLanguage: 'en' as const,
  defaultCurrency: 'USD' as const,
} as const;

// ============================================================================
// LIMITS & CONSTRAINTS
// ============================================================================

export const LIMITS = {
  // File uploads
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxImageSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
  ],
  // Messages
  maxMessageLength: 5000,
  maxAttachmentsPerMessage: 10,
  // Loads
  maxActiveLoadsFree: 3,
  maxActiveLoadsPro: 50,
  maxActiveLoadsBusiness: 500,
  maxActiveLoadsEnterprise: Infinity,
  // Bids
  maxBidsPerLoad: 20,
  bidExpiryHours: 48,
  // Vehicles
  maxVehiclesFree: 1,
  maxVehiclesPro: 10,
  maxVehiclesBusiness: 100,
  maxVehiclesEnterprise: Infinity,
  // Team
  maxTeamMembersFree: 1,
  maxTeamMembersPro: 5,
  maxTeamMembersBusiness: 50,
  maxTeamMembersEnterprise: Infinity,
  // Rate limiting
  rateLimitWindow: 60_000, // 1 minute
  rateLimitMaxRequests: 100,
  // Pagination
  defaultPageSize: 20,
  maxPageSize: 100,
  // Location tracking
  locationUpdateInterval: 30_000, // 30 seconds
  locationHistoryRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
  // Escrow
  escrowFeePercentage: 2.5,
  processingFeePercentage: 2.9,
  processingFeeFixed: 0.30,
  // HOS (Hours of Service)
  maxDrivingHours: 11,
  maxOnDutyHours: 14,
  minBreakHours: 0.5,
  minOffDutyHours: 10,
  cycleLimitHours: 70, // 70-hour/8-day cycle
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  enableEscrow: true,
  enableRealTimeTracking: true,
  enableBidding: true,
  enableMessaging: true,
  enableDocuments: true,
  enableAnalytics: true,
  enableApiAccess: true,
  enableWebhooks: true,
  enableMultiLanguage: true,
  enableBackgroundChecks: true,
  enableRouteOptimization: true,
  enableInsuranceMarketplace: false,
  enableFuelCards: false,
  enableFactoringIntegration: false,
} as const;

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    features: {
      maxActiveLoads: 3,
      maxVehicles: 1,
      maxTeamMembers: 1,
      hasAdvancedAnalytics: false,
      hasApiAccess: false,
      hasPrioritySupport: false,
      hasCustomBranding: false,
      hasEscrowService: true,
      hasBackgroundChecks: false,
      hasRouteOptimization: false,
    },
  },
  pro: {
    name: 'Pro',
    price: { monthly: 49, yearly: 490 },
    features: {
      maxActiveLoads: 50,
      maxVehicles: 10,
      maxTeamMembers: 5,
      hasAdvancedAnalytics: true,
      hasApiAccess: false,
      hasPrioritySupport: true,
      hasCustomBranding: false,
      hasEscrowService: true,
      hasBackgroundChecks: true,
      hasRouteOptimization: true,
    },
  },
  business: {
    name: 'Business',
    price: { monthly: 199, yearly: 1990 },
    features: {
      maxActiveLoads: 500,
      maxVehicles: 100,
      maxTeamMembers: 50,
      hasAdvancedAnalytics: true,
      hasApiAccess: true,
      hasPrioritySupport: true,
      hasCustomBranding: true,
      hasEscrowService: true,
      hasBackgroundChecks: true,
      hasRouteOptimization: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: { monthly: 0, yearly: 0 }, // Custom pricing
    features: {
      maxActiveLoads: Infinity,
      maxVehicles: Infinity,
      maxTeamMembers: Infinity,
      hasAdvancedAnalytics: true,
      hasApiAccess: true,
      hasPrioritySupport: true,
      hasCustomBranding: true,
      hasEscrowService: true,
      hasBackgroundChecks: true,
      hasRouteOptimization: true,
    },
  },
} as const;

// ============================================================================
// LOAD STATUS TRANSITIONS (State Machine)
// ============================================================================

export const LOAD_STATUS_TRANSITIONS: Record<string, string[]> = {
  'posted': ['bidding', 'assigned', 'cancelled'],
  'bidding': ['assigned', 'cancelled'],
  'assigned': ['accepted', 'cancelled'],
  'accepted': ['in_transit', 'cancelled'],
  'in_transit': ['at_pickup', 'cancelled'],
  'at_pickup': ['loaded', 'cancelled'],
  'loaded': ['in_transit', 'at_delivery'],
  'at_delivery': ['delivered', 'disputed'],
  'delivered': ['completed', 'disputed'],
  'completed': [], // Terminal state
  'cancelled': [], // Terminal state
  'disputed': ['completed', 'cancelled'],
};

// ============================================================================
// TRIP STATUS TRANSITIONS
// ============================================================================

export const TRIP_STATUS_TRANSITIONS: Record<string, string[]> = {
  'scheduled': ['en_route_pickup', 'cancelled'],
  'en_route_pickup': ['at_pickup', 'cancelled'],
  'at_pickup': ['loading', 'cancelled'],
  'loading': ['en_route_delivery', 'cancelled'],
  'en_route_delivery': ['at_delivery', 'cancelled'],
  'at_delivery': ['unloading', 'cancelled'],
  'unloading': ['completed', 'cancelled'],
  'completed': [], // Terminal state
  'cancelled': [], // Terminal state
};

// ============================================================================
// PERMISSIONS MATRIX
// ============================================================================

export const PERMISSION_MATRIX = {
  super_admin: ['*'],
  support: [
    'users.read', 'loads.read', 'payments.read', 'documents.review',
    'reports.read', 'messages.read',
  ],
  moderator: [
    'users.read', 'users.ban', 'loads.read', 'loads.delete',
    'documents.review',
  ],
  finance: [
    'users.read', 'payments.read', 'payments.write', 'payments.refund',
    'reports.read', 'reports.export', 'invoices.read', 'invoices.write',
  ],
  operations: [
    'users.read', 'loads.read', 'loads.write', 'documents.review',
    'documents.approve', 'reports.read',
  ],
} as const;

// ============================================================================
// I18N SUPPORTED LOCALES
// ============================================================================

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
] as const;

// ============================================================================
// CURRENCY CONFIG
// ============================================================================

export const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  MXN: { symbol: 'Mex$', name: 'Mexican Peso', decimals: 2 },
  BRL: { symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  CNY: { symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  JPY: { symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  AUD: { symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  INR: { symbol: '₹', name: 'Indian Rupee', decimals: 2 },
} as const;

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  // Location
  LOCATION_UPDATE: 'location:update',
  LOCATION_BATCH: 'location:batch',
  // Loads
  LOAD_CREATED: 'load:created',
  LOAD_UPDATED: 'load:updated',
  LOAD_ASSIGNED: 'load:assigned',
  LOAD_COMPLETED: 'load:completed',
  LOAD_CANCELLED: 'load:cancelled',
  // Bids
  BID_CREATED: 'bid:created',
  BID_UPDATED: 'bid:updated',
  BID_ACCEPTED: 'bid:accepted',
  // Trips
  TRIP_STARTED: 'trip:started',
  TRIP_UPDATED: 'trip:updated',
  TRIP_COMPLETED: 'trip:completed',
  // Payments
  PAYMENT_CREATED: 'payment:created',
  PAYMENT_COMPLETED: 'payment:completed',
  PAYMENT_FAILED: 'payment:failed',
  // Messages
  MESSAGE_CREATED: 'message:created',
  MESSAGE_READ: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  // Notifications
  NOTIFICATION_CREATED: 'notification:created',
  // Admin
  ADMIN_ALERT: 'admin:alert',
  SYSTEM_MAINTENANCE: 'system:maintenance',
} as const;
