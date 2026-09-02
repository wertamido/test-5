/**
 * Zod validation schemas for all entities
 * Used for runtime validation on both server and client
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const AddressSchema = z.object({
  street1: z.string().min(1).max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(2).max(2),
  coordinates: GeoPointSchema.optional(),
});

export const DimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const RegisterSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/),
  password: z.string().min(8).max(100),
  role: z.enum(['trucker', 'client', 'dispatcher']),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  companyName: z.string().max(100).optional(),
  language: z.string().length(2).default('en'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  companyName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  languages: z.array(z.string().length(2)).optional(),
  address: AddressSchema.optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    relationship: z.string().min(1),
    phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/),
    email: z.string().email().optional(),
  }).optional(),
});

// ============================================================================
// LOAD SCHEMAS
// ============================================================================

export const CreateLoadSchema = z.object({
  clientId: z.string().uuid(),
  urgency: z.enum(['standard', 'expedited', 'urgent', 'emergency']),
  freightType: z.enum([
    'dry_van', 'reefer', 'flatbed', 'step_deck', 'lowboy', 'tanker',
    'hopper', 'livestock', 'auto_carrier', 'container', 'power_only', 'other'
  ]),
  category: z.array(z.string()).min(1),
  pickup: z.object({
    name: z.string().min(1),
    address: AddressSchema,
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    appointmentWindow: z.object({
      start: z.date(),
      end: z.date(),
    }).optional(),
    instructions: z.string().optional(),
    unloadingTime: z.number().positive().optional(),
  }),
  delivery: z.object({
    name: z.string().min(1),
    address: AddressSchema,
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    appointmentWindow: z.object({
      start: z.date(),
      end: z.date(),
    }).optional(),
    instructions: z.string().optional(),
    unloadingTime: z.number().positive().optional(),
  }),
  stops: z.array(z.any()).optional().default([]),
  description: z.string().min(1).max(2000),
  commodity: z.string().max(200).optional(),
  weight: z.number().positive(),
  dimensions: DimensionsSchema.optional(),
  pieces: z.number().positive().optional(),
  pallets: z.number().positive().optional(),
  equipmentRequired: z.array(z.object({
    type: z.string(),
    minLength: z.number().positive().optional(),
    minCapacity: z.number().positive().optional(),
    features: z.array(z.string()).default([]),
  })).min(1),
  specialInstructions: z.string().max(2000).optional(),
  temperatureRequirements: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.enum(['celsius', 'fahrenheit']),
  }).optional(),
  hazmatInfo: z.object({
    class: z.string(),
    unNumber: z.string().optional(),
    packingGroup: z.enum(['I', 'II', 'III']).optional(),
    flashPoint: z.number().optional(),
  }).optional(),
  pricing: z.object({
    offeredRate: z.number().positive(),
    currency: z.enum(['USD', 'CAD', 'EUR', 'GBP', 'MXN', 'BRL', 'CNY', 'JPY', 'AUD', 'INR']),
    pricingModel: z.enum(['flat', 'per_mile', 'per_hour', 'per_pound', 'negotiable']),
    fuelSurcharge: z.number().min(0).optional(),
    tollsIncluded: z.boolean().default(false),
    detentionRate: z.number().min(0).optional(),
    layoverRate: z.number().min(0).optional(),
    escrowRequired: z.boolean().default(false),
    escrowAmount: z.number().positive().optional(),
  }),
  pickupDate: z.date(),
  deliveryDate: z.date(),
  isRecurring: z.boolean().default(false),
  recurringConfig: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().positive(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    endDate: z.date().optional(),
  }).optional(),
  tags: z.array(z.string()).default([]),
});

export const UpdateLoadSchema = CreateLoadSchema.partial().extend({
  status: z.enum([
    'posted', 'bidding', 'assigned', 'accepted', 'in_transit',
    'at_pickup', 'loaded', 'at_delivery', 'delivered', 'completed',
    'cancelled', 'disputed'
  ]).optional(),
  assignedTruckerId: z.string().uuid().optional(),
  acceptedBidId: z.string().uuid().optional(),
  currentLocation: GeoPointSchema.optional(),
});

// ============================================================================
// BID SCHEMAS
// ============================================================================

export const CreateBidSchema = z.object({
  loadId: z.string().uuid(),
  truckerId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP', 'MXN', 'BRL', 'CNY', 'JPY', 'AUD', 'INR']),
  estimatedPickupTime: z.date().optional(),
  estimatedDeliveryTime: z.date().optional(),
  message: z.string().max(1000).optional(),
});

export const UpdateBidSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn', 'expired', 'countered']).optional(),
  amount: z.number().positive().optional(),
  counterOffer: z.number().positive().optional(),
  message: z.string().max(1000).optional(),
});

// ============================================================================
// VEHICLE SCHEMAS
// ============================================================================

export const CreateVehicleSchema = z.object({
  truckerId: z.string().uuid(),
  type: z.enum(['tractor', 'straight_truck', 'van', 'reefer', 'flatbed', 'step_deck', 'lowboy', 'tanker', 'dump', 'other']),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().min(1).max(30),
  vin: z.string().min(17).max(17),
  licensePlate: z.string().min(1).max(20),
  jurisdiction: z.string().min(2).max(2),
  specifications: z.object({
    grossWeight: z.number().positive(),
    payloadCapacity: z.number().positive(),
    fuelCapacity: z.number().positive(),
    fuelType: z.enum(['diesel', 'gasoline', 'electric', 'hybrid', 'cng', 'lpg']),
    engineType: z.string().optional(),
    horsepower: z.number().positive().optional(),
    trailerType: z.string().optional(),
    trailerLength: z.number().positive().optional(),
    trailerWidth: z.number().positive().optional(),
    trailerHeight: z.number().positive().optional(),
    maxPallets: z.number().positive().optional(),
    hasLiftgate: z.boolean().default(false),
    hasAirRide: z.boolean().default(false),
    hasRefrigeration: z.boolean().default(false),
    refrigerationTemp: z.object({
      min: z.number(),
      max: z.number(),
      unit: z.enum(['celsius', 'fahrenheit']),
    }).optional(),
  }),
  status: z.enum(['active', 'maintenance', 'inactive', 'suspended']).default('active'),
  registrationExpiry: z.date(),
  inspectionExpiry: z.date(),
  insuranceExpiry: z.date(),
  trailers: z.array(z.any()).default([]),
  maintenanceRecords: z.array(z.any()).default([]),
});

// ============================================================================
// TRIP SCHEMAS
// ============================================================================

export const CreateTripSchema = z.object({
  loadId: z.string().uuid(),
  truckerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  scheduledPickup: z.date(),
  scheduledDelivery: z.date(),
  route: z.array(z.any()).default([]),
});

export const UpdateLocationSchema = z.object({
  tripId: z.string().uuid(),
  location: GeoPointSchema,
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).optional(),
});

export const UpdateHOSStatusSchema = z.object({
  tripId: z.string().uuid(),
  status: z.enum(['off_duty', 'sleeper', 'driving', 'on_duty']),
});

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const CreatePaymentIntentSchema = z.object({
  loadId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP', 'MXN', 'BRL', 'CNY', 'JPY', 'AUD', 'INR']),
  paymentMethodId: z.string().optional(),
  useEscrow: z.boolean().default(true),
});

export const CreatePayoutSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP', 'MXN', 'BRL', 'CNY', 'JPY', 'AUD', 'INR']),
  paymentMethodId: z.string(),
});

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(['text', 'image', 'file', 'location', 'system', 'load_update']).default('text'),
  content: z.string().min(1).max(5000),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file', 'audio', 'video']),
    url: z.string().url(),
    filename: z.string(),
    size: z.number().positive(),
    mimeType: z.string(),
  })).optional(),
});

export const CreateConversationSchema = z.object({
  type: z.enum(['direct', 'load_group', 'support', 'broadcast']),
  participants: z.array(z.string().uuid()).min(1),
  loadId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
});

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const LoadSearchSchema = z.object({
  origin: GeoPointSchema.optional(),
  originRadius: z.number().positive().optional(),
  destination: GeoPointSchema.optional(),
  destinationRadius: z.number().positive().optional(),
  freightTypes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  minWeight: z.number().positive().optional(),
  maxWeight: z.number().positive().optional(),
  equipmentRequired: z.array(z.string()).optional(),
  minRate: z.number().positive().optional(),
  maxRate: z.number().positive().optional(),
  pickupDateStart: z.date().optional(),
  pickupDateEnd: z.date().optional(),
  urgency: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  verifiedOnly: z.boolean().optional(),
  sortBy: z.enum(['date', 'rate', 'distance', 'rating']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const UploadDocumentSchema = z.object({
  type: z.enum([
    'cdl_license', 'vehicle_registration', 'insurance', 'dot_medical_card',
    'drug_test', 'safety_inspection', 'irp_registration', 'ifta_sticker',
    'bill_of_lading', 'proof_of_delivery', 'invoice', 'other'
  ]),
  filename: z.string().min(1),
  url: z.string().url(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const AdminActionSchema = z.object({
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  changes: z.record(z.any()).optional(),
});

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).optional(),
});

// ============================================================================
// EXPORTS
// ============================================================================

export * from './index';
