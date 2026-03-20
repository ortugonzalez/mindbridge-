-- ============================================================
-- BRESO Migration 004 — User types, phone, plan, trial
-- Apply in: Supabase dashboard → SQL Editor → Run
-- ============================================================

-- Add display name (friendly name entered during onboarding)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add user's own phone number for Soledad SMS alerts
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Subscription plan: 'free_trial' | 'essential' | 'premium'
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free_trial'
    CHECK (plan IN ('free_trial', 'essential', 'premium'));

-- Trial start timestamp (NULL means no trial active)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ DEFAULT now();

-- Index for plan-based queries (e.g. finding expired trials)
CREATE INDEX IF NOT EXISTS users_plan_idx ON public.users(plan);
CREATE INDEX IF NOT EXISTS users_trial_start_idx ON public.users(trial_start);
