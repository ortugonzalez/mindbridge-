-- ============================================================
-- BRESO Realtime Setup — Migration 003
-- Enables Supabase Realtime on the alerts table
-- Apply in: Supabase dashboard → SQL Editor → Run
-- ============================================================

-- Add alerts table to realtime publication
-- (Supabase creates supabase_realtime publication by default)
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Note: You also need to enable Realtime for the alerts table in the
-- Supabase dashboard → Database → Replication → Supabase Realtime → alerts ✓
