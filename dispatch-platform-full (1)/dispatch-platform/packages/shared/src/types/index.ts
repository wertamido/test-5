/**
 * Core type definitions for the Freight Dispatch Platform
 * These types are shared across server, web, and mobile packages
 */

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

export type UserRole = 'trucker' | 'client' | 'admin' | 'dispatcher';

export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'banned';

export type VerificationLevel = 'unverified' | 'basic' | 'verified' | 'premium';

export interface User {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  verificationLevel: VerificationLevel;
  profile: UserProfile;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  companyName?: string;
  avatar?: string;
  bio?: string;
  languages: SupportedLanguage[];
  // Trucker-specific
  licenseNumber?: string;
  licenseClass?: string;
  licenseExpiry?: Date;
  yearsOfExperience?: number;
  // Client-specific
  companyType?: 'shipper' | 'broker' | 'manufacturer' | 'distributor' | 'individual';
  taxId?: string;
  // Common
  address: Address;
  emergencyContact?: EmergencyContact;
}

export interface UserPreferences {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  currency: SupportedCurrency;
  distanceUnit: 'km' | 'mi';
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  loadAlerts: boolean;
  messageAlerts: boolean;
  paymentAlerts: boolean;
  marketingAlerts: boolean;
}

export interface PrivacySettings {
  showLocation: boolean;
  showAvailability: boolean;
  showRatings: boolean;
  allowDirectContact: boolean;
}

// ============================================================================
// LOADS & FREIGHT
// ============================================================================

export type LoadStatus =
  | 'posted'
  | 'bidding'
  | 'assigned'
  | 'accepted'
  | 'in_transit'
  | 'at_pickup'
  | 'loaded'
  | 'at_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type LoadUrgency = 'standard' | 'expedited' | 'urgent' | 'emergency';

export type FreightType =
  | 'dry_van'
  | 'reefer'
  | 'flatbed'
  | 'step_deck'
  | 'lowboy'
  | 'tanker'
  | 'hopper'
  | 'livestock'
  | 'auto_carrier'
  | 'container'
  | 'power_only'
  | 'other';

export type LoadCategory =
  | 'general_freight'
  | 'refrigerated'
  | 'hazmat'
  | 'oversized'
  | 'fragile'
  | 'livestock'
  | 'vehicles'
  | 'bulk'
  | 'liquid'
  | 'other';

export interface Load {
  id: string;
  referenceNumber: string;
  clientId: string;
  status: LoadStatus;
  urgency: LoadUrgency;
  freightType: FreightType;
  category: LoadCategory[];
  // Route
  pickup: Location;
  delivery: Location;
  stops: Location[];
  totalDistance: number; // km
  estimatedDuration: number; // hours
  // Cargo
  description: string;
  commodity?: string;
  weight: number; // kg
  dimensions?: Dimensions;
  pieces?: number;
  pallets?: number;
  // Requirements
  equipmentRequired: EquipmentRequirement[];
  specialInstructions?: string;
  temperatureRequirements?: TemperatureRange;
  hazmatInfo?: HazmatInfo;
  // Pricing
  pricing: LoadPricing;
  // Assignment
  assignedTruckerId?: string;
  acceptedBidId?: string;
  // Timestamps
  pickupDate: Date;
  deliveryDate: Date;
  postedAt: Date;
  expiresAt?: Date;
  updatedAt: Date;
  // Tracking
  trackingNumber?: string;
  currentLocation?: GeoPoint;
  // Metadata
  tags: string[];
  isRecurring: boolean;
  recurringConfig?: RecurringConfig;
}

export interface Location {
  id: string;
  name: string;
  address: Address;
  contactName?: string;
  contactPhone?: string;
  appointmentWindow?: TimeWindow;
  instructions?: string;
  unloadingTime?: number; // minutes
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: GeoPoint;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Dimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
}

export interface EquipmentRequirement {
  type: FreightType;
  minLength?: number; // feet
  minCapacity?: number; // kg
  features: string[]; // e.g., ['liftgate', 'pallet_jack', 'air_ride']
}

export interface TemperatureRange {
  min: number; // celsius
  max: number;
  unit: 'celsius' | 'fahrenheit';
}

export interface HazmatInfo {
  class: string;
  unNumber?: string;
  packingGroup?: 'I' | 'II' | 'III';
  flashPoint?: number;
}

export interface LoadPricing {
  offeredRate: number;
  currency: SupportedCurrency;
  pricingModel: 'flat' | 'per_mile' | 'per_hour' | 'per_pound' | 'negotiable';
  fuelSurcharge?: number;
  tollsIncluded: boolean;
  detentionRate?: number; // per hour
  layoverRate?: number;   // per day
  escrowRequired: boolean;
  escrowAmount?: number;
}

export interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  endDate?: Date;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

// ============================================================================
// BIDDING & OFFERS
// ============================================================================

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired' | 'countered';

export interface Bid {
  id: string;
  loadId: string;
  truckerId: string;
  status: BidStatus;
  amount: number;
  currency: SupportedCurrency;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  message?: string;
  counterOffer?: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// VEHICLES & EQUIPMENT
// ============================================================================

export type VehicleType =
  | 'tractor'
  | 'straight_truck'
  | 'van'
  | 'reefer'
  | 'flatbed'
  | 'step_deck'
  | 'lowboy'
  | 'tanker'
  | 'dump'
  | 'other';

export type VehicleStatus = 'active' | 'maintenance' | 'inactive' | 'suspended';

export interface Vehicle {
  id: string;
  truckerId: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
  licensePlate: string;
  jurisdiction: string;
  // Specifications
  specifications: VehicleSpecifications;
  // Status
  status: VehicleStatus;
  currentLocation?: GeoPoint;
  // Documents
  registrationExpiry: Date;
  inspectionExpiry: Date;
  insuranceExpiry: Date;
  // Trailer info
  trailers: Trailer[];
  // Maintenance
  maintenanceRecords: MaintenanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleSpecifications {
  grossWeight: number; // kg
  payloadCapacity: number; // kg
  fuelCapacity: number; // liters
  fuelType: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'cng' | 'lpg';
  engineType?: string;
  horsepower?: number;
  // Trailer specs
  trailerType?: FreightType;
  trailerLength?: number; // feet
  trailerWidth?: number;
  trailerHeight?: number;
  maxPallets?: number;
  hasLiftgate: boolean;
  hasAirRide: boolean;
  hasRefrigeration: boolean;
  refrigerationTemp?: TemperatureRange;
}

export interface Trailer {
  id: string;
  type: FreightType;
  length: number; // feet
  width: number;
  height: number;
  capacity: number; // kg
  licensePlate: string;
  specifications: Partial<VehicleSpecifications>;
}

export interface MaintenanceRecord {
  id: string;
  type: 'routine' | 'repair' | 'inspection' | 'recall';
  description: string;
  mileage: number;
  cost: number;
  performedAt: Date;
  performedBy: string;
  documents?: string[];
  nextServiceMileage?: number;
}

// ============================================================================
// TRIPS & TRACKING
// ============================================================================

export type TripStatus =
  | 'scheduled'
  | 'en_route_pickup'
  | 'at_pickup'
  | 'loading'
  | 'en_route_delivery'
  | 'at_delivery'
  | 'unloading'
  | 'completed'
  | 'cancelled';

export interface Trip {
  id: string;
  loadId: string;
  truckerId: string;
  vehicleId: string;
  status: TripStatus;
  // Route
  route: RouteWaypoint[];
  currentWaypointIndex: number;
  // Timing
  scheduledPickup: Date;
  actualPickup?: Date;
  scheduledDelivery: Date;
  actualDelivery?: Date;
  // Tracking
  currentLocation?: GeoPoint;
  currentSpeed?: number;
  heading?: number;
  // ELD / HOS
  driverHoursToday: number;
  driverHoursWeek: number;
  hosStatus: 'off_duty' | 'sleeper' | 'driving' | 'on_duty';
  hosClockStart: Date;
  // Documents
  bol?: BillOfLading;
  pod?: ProofOfDelivery;
  // Expenses
  expenses: TripExpense[];
  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteWaypoint {
  id: string;
  order: number;
  location: Location;
  arrivalTime?: Date;
  departureTime?: Date;
  status: 'pending' | 'arrived' | 'departed' | 'skipped';
  type: 'pickup' | 'delivery' | 'stop' | 'fuel' | 'rest';
}

export interface BillOfLading {
  id: string;
  number: string;
  issuedBy: string;
  issuedTo: string;
  items: BOLItem[];
  totalWeight: number;
  totalPieces: number;
  specialInstructions?: string;
  signature?: string;
  signedAt?: Date;
  imageUrl?: string;
}

export interface BOLItem {
  description: string;
  quantity: number;
  weight: number;
  dimensions?: Dimensions;
  freightClass?: string;
  nmfcCode?: string;
}

export interface ProofOfDelivery {
  id: string;
  deliveredAt: Date;
  deliveredTo: string;
  signature?: string;
  imageUrl?: string;
  notes?: string;
  condition: 'good' | 'damaged' | 'discrepancy';
  discrepancies?: string[];
}

export interface TripExpense {
  id: string;
  type: 'fuel' | 'toll' | 'lodging' | 'food' | 'maintenance' | 'other';
  amount: number;
  currency: SupportedCurrency;
  description?: string;
  receiptUrl?: string;
  incurredAt: Date;
}

// ============================================================================
// PAYMENTS & FINANCIAL
// ============================================================================

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'held_in_escrow'
  | 'released'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'disputed';

export type PaymentMethodType =
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'ach'
  | 'wire'
  | 'crypto'
  | 'wallet';

export type TransactionType =
  | 'load_payment'
  | 'escrow_deposit'
  | 'escrow_release'
  | 'platform_fee'
  | 'subscription'
  | 'payout'
  | 'refund'
  | 'adjustment';

export interface Payment {
  id: string;
  loadId?: string;
  tripId?: string;
  payerId: string;
  payeeId: string;
  status: PaymentStatus;
  type: TransactionType;
  amount: number;
  currency: SupportedCurrency;
  fees: PaymentFee[];
  method: PaymentMethodType;
  // Escrow
  isEscrow: boolean;
  escrowReleasedAt?: Date;
  // Metadata
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface PaymentFee {
  type: 'platform' | 'processing' | 'escrow' | 'other';
  amount: number;
  description?: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  // Card
  cardLast4?: string;
  cardBrand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  // Bank
  bankName?: string;
  accountLast4?: string;
  routingNumber?: string;
  // Common
  isDefault: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  number: string;
  userId: string;
  // Items
  items: InvoiceItem[];
  subtotal: number;
  taxes: TaxBreakdown[];
  total: number;
  currency: SupportedCurrency;
  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issuedAt: Date;
  dueDate: Date;
  paidAt?: Date;
  // Metadata
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable: boolean;
  metadata?: Record<string, any>;
}

export interface TaxBreakdown {
  name: string;
  rate: number;
  amount: number;
}

// ============================================================================
// RATINGS & REVIEWS
// ============================================================================

export interface Rating {
  id: string;
  loadId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  categories: RatingCategories;
  comment?: string;
  // Metadata
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingCategories {
  communication: number;
  punctuality: number;
  professionalism: number;
  cargoCare: number;
  paymentPromptness?: number;
}

// ============================================================================
// MESSAGING & COMMUNICATION
// ============================================================================

export type MessageType = 'text' | 'image' | 'file' | 'location' | 'system' | 'load_update';

export type ConversationType = 'direct' | 'load_group' | 'support' | 'broadcast';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  attachments?: MessageAttachment[];
  // Metadata
  isRead: boolean;
  readBy: string[];
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[];
  loadId?: string;
  title?: string;
  lastMessage?: Message;
  unreadCount: Record<string, number>;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export type NotificationType =
  | 'load_posted'
  | 'load_assigned'
  | 'bid_received'
  | 'bid_accepted'
  | 'trip_update'
  | 'payment_received'
  | 'payment_due'
  | 'message_received'
  | 'document_required'
  | 'hos_warning'
  | 'vehicle_maintenance'
  | 'system_update'
  | 'promotional';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, any>;
  // Status
  isRead: boolean;
  isArchived: boolean;
  readAt?: Date;
  // Delivery
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
  deliveredAt?: Date;
  createdAt: Date;
}

// ============================================================================
// DOCUMENTS & COMPLIANCE
// ============================================================================

export type DocumentType =
  | 'cdl_license'
  | 'vehicle_registration'
  | 'insurance'
  | 'dot_medical_card'
  | 'drug_test'
  | 'safety_inspection'
  | 'irp_registration'
  | 'ifta_sticker'
  | 'bill_of_lading'
  | 'proof_of_delivery'
  | 'invoice'
  | 'other';

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'needs_review';

export interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  status: DocumentStatus;
  filename: string;
  url: string;
  // Verification
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  // Expiry
  expiresAt?: Date;
  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SUBSCRIPTIONS & PLANS
// ============================================================================

export type SubscriptionPlan = 'free' | 'pro' | 'business' | 'enterprise';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  // Billing
  interval: 'monthly' | 'yearly';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  // Usage
  usage: SubscriptionUsage;
  // Features
  features: PlanFeatures;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  loadsPosted: number;
  loadsCompleted: number;
  messagesSent: number;
  apiCallsUsed: number;
  storageUsed: number; // MB
}

export interface PlanFeatures {
  maxActiveLoads: number;
  maxVehicles: number;
  maxTeamMembers: number;
  hasAdvancedAnalytics: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  hasCustomBranding: boolean;
  hasEscrowService: boolean;
  hasBackgroundChecks: boolean;
  hasRouteOptimization: boolean;
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  event: string;
  properties?: Record<string, any>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface EarningsReport {
  userId: string;
  period: { start: Date; end: Date };
  totalEarnings: number;
  netEarnings: number;
  platformFees: number;
  escrowFees: number;
  totalMiles: number;
  totalLoads: number;
  averagePerMile: number;
  averagePerLoad: number;
  currency: SupportedCurrency;
}

export interface PerformanceMetrics {
  userId: string;
  onTimeDeliveryRate: number;
  averageRating: number;
  totalLoadsCompleted: number;
  totalMilesDriven: number;
  acceptanceRate: number;
  responseTimeMinutes: number;
  disputeRate: number;
  completionRate: number;
}

// ============================================================================
// ADMIN & MODERATION
// ============================================================================

export type AdminRole = 'super_admin' | 'support' | 'moderator' | 'finance' | 'operations';

export interface AdminUser {
  id: string;
  userId: string;
  role: AdminRole;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export type Permission =
  | 'users.read' | 'users.write' | 'users.delete' | 'users.ban'
  | 'loads.read' | 'loads.write' | 'loads.delete'
  | 'payments.read' | 'payments.write' | 'payments.refund'
  | 'documents.review' | 'documents.approve'
  | 'reports.read' | 'reports.export'
  | 'system.settings' | 'system.maintenance'
  | 'analytics.read' | 'analytics.export';

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================================================
// REAL-TIME / LIVE TRACKING
// ============================================================================

export interface LiveLocation {
  userId: string;
  tripId?: string;
  location: GeoPoint;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: Date;
}

export interface SocketEvent {
  event: string;
  data: any;
  userId?: string;
  room?: string;
  timestamp: Date;
}

// ============================================================================
// SEARCH & FILTERING
// ============================================================================

export interface LoadSearchFilters {
  // Location
  origin?: GeoPoint;
  originRadius?: number; // km
  destination?: GeoPoint;
  destinationRadius?: number;
  // Route
  corridorFilter?: { states: string[] };
  // Freight
  freightTypes?: FreightType[];
  categories?: LoadCategory[];
  minWeight?: number;
  maxWeight?: number;
  minLength?: number;
  minWidth?: number;
  minHeight?: number;
  // Equipment
  equipmentRequired?: FreightType[];
  features?: string[];
  // Pricing
  minRate?: number;
  maxRate?: number;
  pricingModel?: LoadPricing['pricingModel'];
  // Timing
  pickupDateStart?: Date;
  pickupDateEnd?: Date;
  deliveryDateStart?: Date;
  deliveryDateEnd?: Date;
  urgency?: LoadUrgency[];
  // Trucker
  minRating?: number;
  verifiedOnly?: boolean;
  // Sorting
  sortBy?: 'date' | 'rate' | 'distance' | 'rating';
  sortOrder?: 'asc' | 'desc';
  // Pagination
  page: number;
  limit: number;
}

export interface TruckerSearchFilters {
  location?: GeoPoint;
  radius?: number; // km
  equipmentTypes?: FreightType[];
  minRating?: number;
  verifiedOnly?: boolean;
  availableOnly?: boolean;
  maxDistance?: number;
  // Pagination
  page: number;
  limit: number;
}

// ============================================================================
// SYSTEM & CONFIGURATION
// ============================================================================

export type SupportedLanguage =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko'
  | 'ar' | 'hi' | 'nl' | 'pl' | 'tr' | 'vi' | 'th' | 'sv' | 'da' | 'no';

export type SupportedCurrency =
  | 'USD' | 'CAD' | 'EUR' | 'GBP' | 'MXN' | 'BRL' | 'CNY' | 'JPY' | 'AUD' | 'INR';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// WEBHOOKS & INTEGRATIONS
// ============================================================================

export type WebhookEvent =
  | 'load.created' | 'load.assigned' | 'load.completed' | 'load.cancelled'
  | 'trip.started' | 'trip.completed' | 'trip.location_updated'
  | 'payment.created' | 'payment.completed' | 'payment.failed'
  | 'message.created'
  | 'document.uploaded' | 'document.approved'
  | 'user.created' | 'user.verified' | 'user.suspended';

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastTriggeredAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from './validation';
export * from './constants';
export * from './utils';
