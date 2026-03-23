-- 008: Crisis events log
CREATE TABLE IF NOT EXISTS crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  level TEXT,
  trigger_type TEXT,
  message_excerpt TEXT,
  notified_contacts BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON crisis_events
  FOR ALL USING (auth.role() = 'service_role');
