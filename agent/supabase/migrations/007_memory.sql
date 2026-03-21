-- 007: Soledad persistent user memory
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  memory_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own memory" ON user_memory
  FOR ALL USING (auth.uid() = user_id);
