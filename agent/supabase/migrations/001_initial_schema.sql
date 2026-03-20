-- ============================================================
-- BRESO Initial Schema — Migration 001
-- Apply in: Supabase dashboard → SQL Editor → Run
-- ============================================================

-- Enable UUID extension (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────
-- Extends Supabase auth.users. One row per registered user.
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  language      TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  timezone      TEXT NOT NULL DEFAULT 'America/Mexico_City',
  checkin_time_preference TEXT NOT NULL DEFAULT '09:00',
  baseline_ready BOOLEAN NOT NULL DEFAULT false,
  alert_level   TEXT CHECK (alert_level IN ('level1', 'level2', 'level3', null)),
  tough_week_active BOOLEAN NOT NULL DEFAULT false,
  wallet_address TEXT,
  consent_tx_hash TEXT
);

-- ─── Check-Ins ────────────────────────────────────────────
-- One per day per user. Raw content never stored.
CREATE TABLE IF NOT EXISTS public.check_ins (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scheduled_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at          TIMESTAMPTZ,
  response_delay_seconds INTEGER,
  word_count            INTEGER,
  tone_score            FLOAT CHECK (tone_score >= -1.0 AND tone_score <= 1.0),
  engagement_flag       BOOLEAN NOT NULL DEFAULT false,
  conversation_mode     TEXT NOT NULL DEFAULT 'listen',
  prompt_version        TEXT NOT NULL DEFAULT 'checkin_v1',
  llm_model_id          TEXT,
  llm_latency_ms        INTEGER,
  contains_crisis_keywords BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS check_ins_user_id_idx ON public.check_ins(user_id);
CREATE INDEX IF NOT EXISTS check_ins_scheduled_at_idx ON public.check_ins(scheduled_at DESC);

-- ─── Behavioral Baselines ─────────────────────────────────
-- One per user. Updated after each check-in once >= 7 exist.
CREATE TABLE IF NOT EXISTS public.behavioral_baselines (
  user_id                       UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  computed_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  checkins_count                INTEGER NOT NULL DEFAULT 0,
  avg_tone_score                FLOAT NOT NULL DEFAULT 0.0,
  tone_stddev                   FLOAT NOT NULL DEFAULT 0.0,
  avg_response_delay_seconds    FLOAT NOT NULL DEFAULT 0.0,
  delay_stddev                  FLOAT NOT NULL DEFAULT 0.0,
  avg_word_count                FLOAT NOT NULL DEFAULT 0.0,
  wordcount_stddev              FLOAT NOT NULL DEFAULT 0.0,
  engagement_rate               FLOAT NOT NULL DEFAULT 1.0 CHECK (engagement_rate >= 0 AND engagement_rate <= 1)
);

-- ─── Personalization Profiles ─────────────────────────────
-- One per user. JSON fields for interests, routines, etc.
CREATE TABLE IF NOT EXISTS public.personalization_profiles (
  user_id               UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  interests             JSONB NOT NULL DEFAULT '[]',
  hobbies               JSONB NOT NULL DEFAULT '[]',
  joy_triggers          JSONB NOT NULL DEFAULT '[]',
  energy_drains         JSONB NOT NULL DEFAULT '[]',
  energy_by_hour        JSONB NOT NULL DEFAULT '{}',
  active_hours          JSONB NOT NULL DEFAULT '[]',
  preferred_contact_style TEXT DEFAULT 'gentle' CHECK (preferred_contact_style IN ('direct', 'gentle', 'humorous')),
  checkins_contributing INTEGER NOT NULL DEFAULT 0
);

-- ─── Trusted Contacts ─────────────────────────────────────
-- Up to 2 per user (Essential: 1, Premium: 2). ZK-verified.
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_email         TEXT NOT NULL,
  relationship_label    TEXT NOT NULL,
  zk_verified           BOOLEAN NOT NULL DEFAULT false,
  zk_verification_at    TIMESTAMPTZ,
  zk_age_range_confirmed BOOLEAN NOT NULL DEFAULT false,
  zk_nullifier          TEXT,
  alert_threshold       TEXT NOT NULL DEFAULT 'moderate' CHECK (alert_threshold IN ('mild', 'moderate', 'high')),
  active                BOOLEAN NOT NULL DEFAULT false,
  wallet_address        TEXT,
  dashboard_token       TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trusted_contacts_user_id_idx ON public.trusted_contacts(user_id);

-- ─── Consent Records ──────────────────────────────────────
-- Immutable. Each preference change creates a new row.
-- On-chain record tracked via on_chain_tx_hash.
CREATE TABLE IF NOT EXISTS public.consent_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  on_chain_tx_hash  TEXT,
  block_number      INTEGER,
  action_type       TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'revoke')),
  payload_hash      TEXT,
  contact_wallet    TEXT,
  threshold_at_consent TEXT CHECK (threshold_at_consent IN ('mild', 'moderate', 'high'))
);

CREATE INDEX IF NOT EXISTS consent_records_user_id_idx ON public.consent_records(user_id);

-- ─── Alerts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alerts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  triggered_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity_level        TEXT NOT NULL CHECK (severity_level IN ('mild', 'moderate', 'high')),
  triggering_dimensions JSONB NOT NULL DEFAULT '[]',
  deviation_summary     JSONB DEFAULT '{}',
  contact_notified_at   TIMESTAMPTZ,
  contact_message_hash  TEXT,
  booking_initiated     BOOLEAN NOT NULL DEFAULT false,
  on_chain_tx_hash      TEXT,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'booking_triggered', 'resolved', 'manual_required'))
);

CREATE INDEX IF NOT EXISTS alerts_user_id_idx ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS alerts_triggered_at_idx ON public.alerts(triggered_at DESC);

-- ─── Subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier                TEXT NOT NULL CHECK (tier IN ('essential', 'premium')),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ,
  payment_tx_hash     TEXT,
  payment_amount_usdt FLOAT,
  auto_renew          BOOLEAN NOT NULL DEFAULT true,
  last_weekly_summary TEXT
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);

-- ─── Goals (Premium) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  description      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  last_followup_at TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals(user_id);

-- ─── Mental Health Professionals ──────────────────────────
CREATE TABLE IF NOT EXISTS public.mental_health_professionals (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      TEXT NOT NULL,
  language                  TEXT NOT NULL CHECK (language IN ('es', 'en')),
  region                    TEXT NOT NULL,
  consultation_rate_usdt    FLOAT NOT NULL,
  available                 BOOLEAN NOT NULL DEFAULT true,
  contact_info              TEXT
);

-- ─── Consultation Bookings ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultation_bookings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id              UUID REFERENCES public.alerts(id),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  professional_id       UUID REFERENCES public.mental_health_professionals(id),
  initiated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at          TIMESTAMPTZ,
  consultation_datetime TIMESTAMPTZ,
  payment_tx_hash       TEXT,
  payment_amount_usdt   FLOAT,
  payment_status        TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'failed')),
  booking_status        TEXT NOT NULL DEFAULT 'initiated' CHECK (booking_status IN ('initiated', 'confirmed', 'failed')),
  failure_reason        TEXT
);

CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.consultation_bookings(user_id);

-- ─── Agent Identity ───────────────────────────────────────
-- Singleton — one row per deployment.
CREATE TABLE IF NOT EXISTS public.agent_identity (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nft_token_id        TEXT,
  contract_address    TEXT,
  registered_at       TIMESTAMPTZ DEFAULT now(),
  agent_wallet_address TEXT,
  agent_name          TEXT NOT NULL DEFAULT 'BRESO',
  agent_version       TEXT NOT NULL DEFAULT '1.0.0'
);

-- ─── Seed: Demo Professionals ─────────────────────────────
INSERT INTO public.mental_health_professionals (name, language, region, consultation_rate_usdt, contact_info) VALUES
  ('Dra. María García', 'es', 'MX', 5.0, 'demo-professional-1@breso.demo'),
  ('Dr. Carlos Rodríguez', 'es', 'AR', 5.0, 'demo-professional-2@breso.demo'),
  ('Dra. Ana Martínez', 'es', 'CO', 5.0, 'demo-professional-3@breso.demo'),
  ('Dr. Luis Pérez', 'es', 'CL', 5.0, 'demo-professional-4@breso.demo'),
  ('Dr. James Williams', 'en', 'US', 5.0, 'demo-professional-5@breso.demo')
ON CONFLICT DO NOTHING;
