-- ============================================================
-- BRESO Migration 011 — DeFi cashback + invite token columns
-- Apply in: Supabase dashboard → SQL Editor → Run
-- ============================================================

-- ─── user_cashbacks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_cashbacks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES public.users(id),
  plan                 TEXT,
  subscription_amount  DECIMAL(10,4),
  yield_generated      DECIMAL(10,6),
  cashback_amount      DECIMAL(10,4),
  status               TEXT DEFAULT 'pending'
                         CHECK (status IN ('pending', 'applied', 'expired')),
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_cashbacks_user_id_idx
  ON public.user_cashbacks(user_id);

-- ─── user_relationships: invite columns ──────────────────────
ALTER TABLE public.user_relationships
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid();

ALTER TABLE public.user_relationships
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ;

-- Allow NULL patient_id for pending_patient invites
ALTER TABLE public.user_relationships
  ALTER COLUMN patient_id DROP NOT NULL;

-- Update status CHECK to include pending_patient
ALTER TABLE public.user_relationships
  DROP CONSTRAINT IF EXISTS user_relationships_status_check;

ALTER TABLE public.user_relationships
  ADD CONSTRAINT user_relationships_status_check
    CHECK (status IN ('pending', 'active', 'rejected', 'pending_patient'));

-- Index for invite token lookups
CREATE INDEX IF NOT EXISTS user_relationships_invite_token_idx
  ON public.user_relationships(invite_token);

-- Allow family members to insert invite rows (patient_id is NULL at this stage)
DO $$ BEGIN
  CREATE POLICY "family can insert invite"
    ON public.user_relationships FOR INSERT
    WITH CHECK (related_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow patient to update (accept invite) — sets patient_id
DO $$ BEGIN
  CREATE POLICY "patient can accept invite"
    ON public.user_relationships FOR UPDATE
    USING (invite_token IS NOT NULL AND patient_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
