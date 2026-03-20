-- ============================================================
-- BRESO Migration 005 — User types and relationships
-- Apply in: Supabase dashboard → SQL Editor → Run
-- ============================================================

-- Add user_type to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'patient'
    CHECK (user_type IN ('patient', 'family', 'professional'));

CREATE INDEX IF NOT EXISTS users_user_type_idx ON public.users(user_type);

-- ─── User Relationships ────────────────────────────────────
-- Links patients to family members or professionals.
CREATE TABLE IF NOT EXISTS public.user_relationships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  related_user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('family', 'professional')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'active', 'rejected')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, related_user_id)
);

CREATE INDEX IF NOT EXISTS user_relationships_patient_idx
  ON public.user_relationships(patient_id);
CREATE INDEX IF NOT EXISTS user_relationships_related_idx
  ON public.user_relationships(related_user_id);

-- RLS: patients see their own relationships; related users see relationships they're part of
ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient sees own relationships"
  ON public.user_relationships FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "related user sees their side"
  ON public.user_relationships FOR SELECT
  USING (related_user_id = auth.uid());

CREATE POLICY "patient can insert"
  ON public.user_relationships FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "related user can update status"
  ON public.user_relationships FOR UPDATE
  USING (related_user_id = auth.uid());
