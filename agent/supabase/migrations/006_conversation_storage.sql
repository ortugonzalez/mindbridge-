-- ============================================================
-- BRESO Migration 006 — Conversation storage
-- Adds user_response and breso_response to check_ins.
-- Apply in: Supabase dashboard → SQL Editor → Run
-- ============================================================

-- Store the user's message for conversation history
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS user_response TEXT;

-- Store Soledad's reply for conversation history
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS breso_response TEXT;

-- Also store the original opening message Soledad sent
-- (already exists as a computed field in some rows — make it explicit)
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS message TEXT;

-- Index for efficient conversation history queries
CREATE INDEX IF NOT EXISTS check_ins_responded_at_idx
  ON public.check_ins(responded_at DESC)
  WHERE responded_at IS NOT NULL;
