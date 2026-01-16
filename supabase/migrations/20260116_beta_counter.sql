-- Beta Counter and Email Captures Table
-- Tracks free beta unlocks and captured emails

-- Table for global settings like the beta counter
CREATE TABLE IF NOT EXISTS beta_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  free_unlocks_remaining INTEGER NOT NULL DEFAULT 50,
  total_unlocks_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO beta_settings (id, free_unlocks_remaining)
VALUES ('default', 50)
ON CONFLICT (id) DO NOTHING;

-- Table for captured emails from free beta
CREATE TABLE IF NOT EXISTS beta_email_captures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  analysis_id UUID NOT NULL,
  analysis_type VARCHAR(20) NOT NULL, -- 'jeonse' or 'wolse'
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate unlocks for same email + analysis
  UNIQUE(email, analysis_id)
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_beta_email_captures_email
  ON beta_email_captures(email);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_beta_email_captures_date
  ON beta_email_captures(unlocked_at);

-- Enable Row Level Security
ALTER TABLE beta_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_email_captures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beta_settings (read for all, write via service role only)
CREATE POLICY "Anyone can read beta settings"
  ON beta_settings FOR SELECT
  USING (true);

-- RLS Policies for beta_email_captures (write via service role)
CREATE POLICY "Anyone can insert email captures"
  ON beta_email_captures FOR INSERT
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE beta_settings IS 'Global settings for the free beta program';
COMMENT ON TABLE beta_email_captures IS 'Captured emails from users who unlocked free reports';
COMMENT ON COLUMN beta_settings.free_unlocks_remaining IS 'Number of free report unlocks remaining';
