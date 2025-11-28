-- Ensure user_id column exists in analysis_results table
-- This links analyses to authenticated users

-- Add user_id column if it doesn't exist (should already be there from the Database types)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);

-- Create index for faster queries by user and status
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_status ON analysis_results(user_id, status);

-- Update Row Level Security (RLS) policies for analysis_results
-- Enable RLS
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own analyses" ON analysis_results;
DROP POLICY IF EXISTS "Users can create analyses" ON analysis_results;
DROP POLICY IF EXISTS "Users can update their own analyses" ON analysis_results;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON analysis_results;

-- Policy: Users can view their own analyses
CREATE POLICY "Users can view their own analyses"
  ON analysis_results
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create analyses (user_id will be set by the API)
CREATE POLICY "Users can create analyses"
  ON analysis_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own analyses
CREATE POLICY "Users can update their own analyses"
  ON analysis_results
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own analyses
CREATE POLICY "Users can delete their own analyses"
  ON analysis_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for properties table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON properties;

-- Policy: Everyone can view properties (public data)
CREATE POLICY "Properties are viewable by everyone"
  ON properties
  FOR SELECT
  USING (true);

-- Policy: Service role can manage properties
-- (This is handled by the API using service role key)

-- Update RLS policies for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can create payments" ON payments;

-- Policy: Users can view payments for their analyses
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_results
      WHERE analysis_results.id = payments.analysis_id
      AND analysis_results.user_id = auth.uid()
    )
  );

-- Policy: Users can create payments for their analyses
CREATE POLICY "Users can create payments"
  ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_results
      WHERE analysis_results.id = payments.analysis_id
      AND analysis_results.user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON COLUMN analysis_results.user_id IS 'Foreign key to auth.users - owner of the analysis';
