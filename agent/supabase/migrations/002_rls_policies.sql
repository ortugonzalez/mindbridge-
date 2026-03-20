-- ============================================================
-- BRESO RLS Policies — Migration 002
-- Apply AFTER 001_initial_schema.sql
-- Apply in: Supabase dashboard → SQL Editor → Run
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;
-- agent_identity and mental_health_professionals are public-readable
ALTER TABLE public.agent_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mental_health_professionals ENABLE ROW LEVEL SECURITY;

-- ─── users ────────────────────────────────────────────────
CREATE POLICY "users: own row only"
  ON public.users FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── check_ins ────────────────────────────────────────────
CREATE POLICY "check_ins: own rows only"
  ON public.check_ins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── behavioral_baselines ─────────────────────────────────
CREATE POLICY "baselines: own row only"
  ON public.behavioral_baselines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── personalization_profiles ─────────────────────────────
CREATE POLICY "profiles: own row only"
  ON public.personalization_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── trusted_contacts ─────────────────────────────────────
CREATE POLICY "contacts: own rows only"
  ON public.trusted_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── consent_records ──────────────────────────────────────
CREATE POLICY "consent: own rows only"
  ON public.consent_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── alerts ───────────────────────────────────────────────
CREATE POLICY "alerts: own rows only"
  ON public.alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── subscriptions ────────────────────────────────────────
CREATE POLICY "subscriptions: own row only"
  ON public.subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── goals ────────────────────────────────────────────────
CREATE POLICY "goals: own rows only"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── consultation_bookings ────────────────────────────────
CREATE POLICY "bookings: own rows only"
  ON public.consultation_bookings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── agent_identity — public read, no write ───────────────
CREATE POLICY "agent_identity: public read"
  ON public.agent_identity FOR SELECT
  USING (true);

-- ─── mental_health_professionals — public read ───────────
CREATE POLICY "professionals: public read"
  ON public.mental_health_professionals FOR SELECT
  USING (true);

-- ─── Service role bypass ──────────────────────────────────
-- The FastAPI backend uses the service_role key which bypasses RLS automatically.
-- No additional policies needed for backend operations.
-- Frontend uses the anon key and is subject to all policies above.
