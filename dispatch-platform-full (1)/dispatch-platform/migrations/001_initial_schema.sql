-- ============================================================================
-- FREIGHT DISPATCH PLATFORM - INITIAL SCHEMA MIGRATION
-- ============================================================================
-- This migration creates the complete database schema for the platform.
-- Supports PostgreSQL 12+
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('trucker', 'client', 'admin', 'dispatcher');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification', 'banned');
CREATE TYPE verification_level AS ENUM ('unverified', 'basic', 'verified', 'premium');
CREATE TYPE load_status AS ENUM (
  'posted', 'bidding', 'assigned', 'accepted', 'in_transit',
  'at_pickup', 'loaded', 'at_delivery', 'delivered', 'completed',
  'cancelled', 'disputed'
);
CREATE TYPE load_urgency AS ENUM ('standard', 'expedited', 'urgent', 'emergency');
CREATE TYPE freight_type AS ENUM (
  'dry_van', 'reefer', 'flatbed', 'step_deck', 'lowboy', 'tanker',
  'hopper', 'livestock', 'auto_carrier', 'container', 'power_only', 'other'
);
CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn', 'expired', 'countered');
CREATE TYPE vehicle_type AS ENUM (
  'tractor', 'straight_truck', 'van', 'reefer', 'flatbed', 'step_deck',
  'lowboy', 'tanker', 'dump', 'other'
);
CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'inactive', 'suspended');
CREATE TYPE trip_status AS ENUM (
  'scheduled', 'en_route_pickup', 'at_pickup', 'loading',
  'en_route_delivery', 'at_delivery', 'unloading', 'completed', 'cancelled'
);
CREATE TYPE hos_status AS ENUM ('off_duty', 'sleeper', 'driving', 'on_duty');
CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'held_in_escrow', 'released',
  'completed', 'failed', 'refunded', 'disputed'
);
CREATE TYPE payment_type AS ENUM (
  'load_payment', 'escrow_deposit', 'escrow_release', 'platform_fee',
  'subscription', 'payout', 'refund', 'adjustment'
);
CREATE TYPE payment_method_type AS ENUM (
  'credit_card', 'debit_card', 'bank_transfer', 'ach', 'wire', 'crypto', 'wallet'
);
CREATE TYPE document_type AS ENUM (
  'cdl_license', 'vehicle_registration', 'insurance', 'dot_medical_card',
  'drug_test', 'safety_inspection', 'irp_registration', 'ifta_sticker',
  'bill_of_lading', 'proof_of_delivery', 'invoice', 'other'
);
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected', 'expired', 'needs_review');
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'business', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'incomplete');
CREATE TYPE notification_type AS ENUM (
  'load_posted', 'load_assigned', 'bid_received', 'bid_accepted',
  'trip_update', 'payment_received', 'payment_due', 'message_received',
  'document_required', 'hos_warning', 'vehicle_maintenance',
  'system_update', 'promotional'
);
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'location', 'system', 'load_update');
CREATE TYPE conversation_type AS ENUM ('direct', 'load_group', 'support', 'broadcast');
CREATE TYPE admin_role AS ENUM ('super_admin', 'support', 'moderator', 'finance', 'operations');

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'trucker',
  status user_status NOT NULL DEFAULT 'pending_verification',
  verification_level verification_level NOT NULL DEFAULT 'unverified',
  
  -- Profile
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  company_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  preferred_language VARCHAR(2) NOT NULL DEFAULT 'en',
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  distance_unit VARCHAR(2) NOT NULL DEFAULT 'km',
  
  -- Trucker-specific
  license_number VARCHAR(50),
  license_class VARCHAR(10),
  license_expiry DATE,
  years_of_experience INTEGER DEFAULT 0,
  
  -- Client-specific
  company_type VARCHAR(20),
  tax_id VARCHAR(50),
  
  -- Address (JSON for flexibility)
  address JSONB NOT NULL DEFAULT '{}',
  emergency_contact JSONB,
  
  -- Verification
  email_verified_at TIMESTAMP,
  phone_verified_at TIMESTAMP,
  email_verification_token VARCHAR(255),
  phone_verification_code VARCHAR(10),
  
  -- Security
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  failed_login_attempts INTEGER DEFAULT 0,
  last_failed_login_at TIMESTAMP,
  last_login_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_company ON users(company_name);
CREATE INDEX idx_users_created ON users(created_at DESC);

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email BOOLEAN DEFAULT TRUE,
  sms BOOLEAN DEFAULT TRUE,
  push BOOLEAN DEFAULT TRUE,
  load_alerts BOOLEAN DEFAULT TRUE,
  message_alerts BOOLEAN DEFAULT TRUE,
  payment_alerts BOOLEAN DEFAULT TRUE,
  marketing_alerts BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trucker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type vehicle_type NOT NULL,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  color VARCHAR(30),
  vin VARCHAR(17) NOT NULL UNIQUE,
  license_plate VARCHAR(20) NOT NULL,
  jurisdiction VARCHAR(2) NOT NULL,
  
  -- Specifications (JSON for flexibility)
  specifications JSONB NOT NULL DEFAULT '{}',
  
  status vehicle_status NOT NULL DEFAULT 'active',
  
  -- Documents expiry
  registration_expiry DATE NOT NULL,
  inspection_expiry DATE NOT NULL,
  insurance_expiry DATE NOT NULL,
  
  -- Trailers (JSON array)
  trailers JSONB DEFAULT '[]',
  
  -- Maintenance
  maintenance_records JSONB DEFAULT '[]',
  current_mileage INTEGER DEFAULT 0,
  
  -- Location
  current_location GEOGRAPHY(POINT, 4326),
  last_location_update TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_trucker ON vehicles(trucker_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_location ON vehicles USING GIST(current_location);

-- ============================================================================
-- LOADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS loads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number VARCHAR(50) NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status load_status NOT NULL DEFAULT 'posted',
  urgency load_urgency NOT NULL DEFAULT 'standard',
  freight_type freight_type NOT NULL,
  category TEXT[] NOT NULL DEFAULT '{}',
  
  -- Route
  pickup JSONB NOT NULL,
  delivery JSONB NOT NULL,
  stops JSONB DEFAULT '[]',
  total_distance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estimated_duration INTEGER NOT NULL DEFAULT 0, -- hours
  
  -- Cargo
  description TEXT NOT NULL,
  commodity VARCHAR(200),
  weight DECIMAL(10, 2) NOT NULL, -- kg
  dimensions JSONB,
  pieces INTEGER,
  pallets INTEGER,
  
  -- Requirements
  equipment_required JSONB NOT NULL DEFAULT '[]',
  special_instructions TEXT,
  temperature_requirements JSONB,
  hazmat_info JSONB,
  
  -- Pricing
  pricing JSONB NOT NULL,
  
  -- Assignment
  assigned_trucker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_bid_id UUID,
  
  -- Timestamps
  pickup_date TIMESTAMP NOT NULL,
  delivery_date TIMESTAMP NOT NULL,
  posted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Tracking
  tracking_number VARCHAR(100),
  current_location GEOGRAPHY(POINT, 4326),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_config JSONB,
  metadata JSONB DEFAULT '{}',
  
  -- Search optimization
  pickup_geohash VARCHAR(12),
  delivery_geohash VARCHAR(12),
  pickup_city VARCHAR(100),
  delivery_city VARCHAR(100),
  pickup_state VARCHAR(50),
  delivery_state VARCHAR(50)
);

CREATE INDEX idx_loads_client ON loads(client_id);
CREATE INDEX idx_loads_trucker ON loads(assigned_trucker_id);
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_loads_freight_type ON loads(freight_type);
CREATE INDEX idx_loads_pickup_date ON loads(pickup_date);
CREATE INDEX idx_loads_posted ON loads(posted_at DESC);
CREATE INDEX idx_loads_location ON loads USING GIST(current_location);
CREATE INDEX idx_loads_search ON loads(freight_type, status, pickup_date)
  WHERE status IN ('posted', 'bidding');
CREATE INDEX idx_loads_urgency ON loads(urgency);

-- ============================================================================
-- BIDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  trucker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status bid_status NOT NULL DEFAULT 'pending',
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  estimated_pickup_time TIMESTAMP,
  estimated_delivery_time TIMESTAMP,
  message TEXT,
  counter_offer DECIMAL(12, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  
  UNIQUE(load_id, trucker_id) -- One bid per trucker per load
);

CREATE INDEX idx_bids_load ON bids(load_id);
CREATE INDEX idx_bids_trucker ON bids(trucker_id);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_amount ON bids(amount);
CREATE INDEX idx_bids_created ON bids(created_at DESC);

-- ============================================================================
-- TRIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID NOT NULL UNIQUE REFERENCES loads(id) ON DELETE CASCADE,
  trucker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  status trip_status NOT NULL DEFAULT 'scheduled',
  
  -- Route
  route JSONB NOT NULL DEFAULT '[]',
  current_waypoint_index INTEGER DEFAULT 0,
  
  -- Timing
  scheduled_pickup TIMESTAMP NOT NULL,
  actual_pickup TIMESTAMP,
  scheduled_delivery TIMESTAMP NOT NULL,
  actual_delivery TIMESTAMP,
  
  -- Tracking
  current_location GEOGRAPHY(POINT, 4326),
  current_speed DECIMAL(5, 2),
  heading DECIMAL(5, 2),
  last_location_update TIMESTAMP,
  
  -- ELD / HOS
  driver_hours_today DECIMAL(4, 2) DEFAULT 0,
  driver_hours_week DECIMAL(5, 2) DEFAULT 0,
  hos_status hos_status DEFAULT 'off_duty',
  hos_clock_start TIMESTAMP DEFAULT NOW(),
  hos_log JSONB DEFAULT '[]',
  
  -- Documents
  bol_id UUID,
  pod_id UUID,
  
  -- Expenses
  expenses JSONB DEFAULT '[]',
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trips_load ON trips(load_id);
CREATE INDEX idx_trips_trucker ON trips(trucker_id);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_location ON trips USING GIST(current_location);
CREATE INDEX idx_trips_pickup ON trips(scheduled_pickup);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status payment_status NOT NULL DEFAULT 'pending',
  type payment_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  fees JSONB DEFAULT '[]',
  method payment_method_type NOT NULL,
  
  -- Escrow
  is_escrow BOOLEAN DEFAULT FALSE,
  escrow_released_at TIMESTAMP,
  escrow_release_conditions JSONB,
  
  -- External payment info
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  external_reference VARCHAR(255),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_payments_load ON payments(load_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_payee ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(type);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type payment_method_type NOT NULL,
  -- Card (encrypted)
  card_last4 VARCHAR(4),
  card_brand VARCHAR(20),
  expiry_month INTEGER,
  expiry_year INTEGER,
  -- Bank
  bank_name VARCHAR(100),
  account_last4 VARCHAR(4),
  routing_number_encrypted TEXT,
  -- Stripe
  stripe_payment_method_id VARCHAR(255),
  -- Common
  is_default BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  taxes JSONB DEFAULT '[]',
  total DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type conversation_type NOT NULL DEFAULT 'direct',
  participants UUID[] NOT NULL,
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
  title VARCHAR(200),
  last_message_id UUID,
  unread_count JSONB DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX idx_conversations_load ON conversations(load_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type message_type NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT FALSE,
  read_by UUID[] DEFAULT '{}',
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  channels TEXT[] DEFAULT '{in_app}',
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  status document_status NOT NULL DEFAULT 'pending',
  filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  expires_at DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);

-- ============================================================================
-- RATINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating DECIMAL(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  categories JSONB NOT NULL DEFAULT '{}',
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(load_id, reviewer_id, reviewee_id)
);

CREATE INDEX idx_ratings_reviewee ON ratings(reviewee_id);
CREATE INDEX idx_ratings_load ON ratings(load_id);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  interval VARCHAR(10) NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMP NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  usage JSONB DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}',
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- ADMIN USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'support',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event VARCHAR(100) NOT NULL,
  properties JSONB,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_event ON analytics_events(event, created_at DESC);
CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- ============================================================================
-- WEBHOOKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_user ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);

-- ============================================================================
-- FAVORITES / SAVED LOADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_loads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, load_id)
);

CREATE INDEX idx_saved_loads_user ON saved_loads(user_id);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  evidence JSONB DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_load ON disputes(load_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================================
-- PUSH NOTIFICATION TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
  device_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE UNIQUE INDEX idx_push_tokens_token ON push_tokens(token);

-- ============================================================================
-- ERROR LOGS TABLE (for production error tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id VARCHAR(255),
  message TEXT NOT NULL,
  stack TEXT,
  path VARCHAR(500),
  method VARCHAR(10),
  user_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_request ON error_logs(request_id);

-- ============================================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
      'users', 'vehicles', 'loads', 'bids', 'trips', 'payments',
      'payment_methods', 'invoices', 'conversations', 'documents',
      'ratings', 'subscriptions', 'admin_users', 'webhooks',
      'notification_preferences', 'disputes', 'push_tokens'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_%s_updated_at ON %s;
      CREATE TRIGGER trigger_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data (admin bypass via policy)
CREATE POLICY users_self_access ON users
  FOR ALL USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

-- Loads: clients see their own, truckers see assigned/public
CREATE POLICY loads_access ON loads
  FOR SELECT USING (
    client_id = auth.uid() OR
    assigned_trucker_id = auth.uid() OR
    status IN ('posted', 'bidding')
  );

CREATE POLICY loads_modify ON loads
  FOR ALL USING (client_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

-- Trips: trucker sees own, client sees assigned loads
CREATE POLICY trips_access ON trips
  FOR ALL USING (
    trucker_id = auth.uid() OR
    EXISTS (SELECT 1 FROM loads WHERE id = trip.load_id AND client_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Payments: payer or payee can see
CREATE POLICY payments_access ON payments
  FOR ALL USING (
    payer_id = auth.uid() OR
    payee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Conversations: participants only
CREATE POLICY conversations_access ON conversations
  FOR ALL USING (auth.uid() = ANY(participants));

-- Messages: conversation participants only
CREATE POLICY messages_access ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND auth.uid() = ANY(participants)
    )
  );

-- Documents: owner or admin
CREATE POLICY documents_access ON documents
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- SEED DATA (Essential lookup data)
-- ============================================================================

-- Insert default admin user (password: Admin@123 - CHANGE IN PRODUCTION)
INSERT INTO users (
  email, phone, password_hash, role, status, verification_level,
  first_name, last_name, preferred_language, timezone,
  address, created_at, updated_at
) VALUES (
  'admin@freightconnect.com',
  '+15555550000',
  '$2b$12$LQv3c1yqBwEHx8vQKpQzOeJq4n5x6B7c8D9e0F1g2H3i4J5k6L7m8N9o0P1q2',
  'admin',
  'active',
  'premium',
  'System',
  'Administrator',
  'en',
  'UTC',
  '{"street1": "123 Admin St", "city": "Admin City", "state": "AD", "postalCode": "00000", "country": "US"}',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO admin_users (user_id, role, permissions)
SELECT id, 'super_admin', ARRAY['*']
FROM users WHERE email = 'admin@freightconnect.com'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
SELECT 'Database schema created successfully' AS result;
