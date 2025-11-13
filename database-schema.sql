-- Jeonse Safety Checker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  dong TEXT NOT NULL,
  building_number TEXT,
  floor INTEGER,
  unit TEXT,

  -- Property details
  building_name TEXT,
  building_year INTEGER,
  exclusive_area DECIMAL,
  total_floors INTEGER,

  -- Calculated values
  estimated_value_low BIGINT,
  estimated_value_mid BIGINT,
  estimated_value_high BIGINT,

  -- Metadata
  last_analyzed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(address, building_number, floor, unit)
);

-- Analysis results table
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  property_id UUID REFERENCES properties(id),

  -- User inputs
  proposed_jeonse BIGINT NOT NULL,

  -- Analysis results
  safety_score INTEGER,
  risk_level TEXT, -- CRITICAL, HIGH, MEDIUM, LOW

  -- Deunggibu data (stored as JSONB)
  deunggibu_data JSONB,

  -- Risk findings
  risks JSONB,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed

  -- Payment
  payment_amount INTEGER,
  payment_status TEXT,
  payment_key TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Transaction data cache
CREATE TABLE transaction_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id),

  -- Transaction details
  transaction_date DATE,
  transaction_price BIGINT,
  floor INTEGER,
  area DECIMAL,

  -- Source
  data_source TEXT, -- 'molit', 'kb', 'hogangnono'

  created_at TIMESTAMP DEFAULT NOW()
);

-- Building register cache (건축물대장)
CREATE TABLE building_register_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL,

  -- Building details
  building_data JSONB,

  -- Violations
  has_violations BOOLEAN DEFAULT FALSE,
  has_unauthorized_construction BOOLEAN DEFAULT FALSE,
  violation_details JSONB,

  -- Metadata
  fetched_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(address)
);

-- User uploaded documents
CREATE TABLE uploaded_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analysis_results(id),

  document_type TEXT, -- 'deunggibu', 'contract', 'other'
  file_path TEXT,
  original_filename TEXT,

  -- OCR results
  ocr_text TEXT,
  parsed_data JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_properties_address ON properties(address);
CREATE INDEX idx_analysis_user ON analysis_results(user_id);
CREATE INDEX idx_analysis_status ON analysis_results(status);
CREATE INDEX idx_transaction_property ON transaction_cache(property_id);
CREATE INDEX idx_transaction_date ON transaction_cache(transaction_date);
CREATE INDEX idx_building_cache_address ON building_register_cache(address);

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
CREATE POLICY "Users can view own analyses"
  ON analysis_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON analysis_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON analysis_results FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only see documents for their analyses
CREATE POLICY "Users can view own documents"
  ON uploaded_documents FOR SELECT
  USING (
    analysis_id IN (
      SELECT id FROM analysis_results WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own documents"
  ON uploaded_documents FOR INSERT
  WITH CHECK (
    analysis_id IN (
      SELECT id FROM analysis_results WHERE user_id = auth.uid()
    )
  );

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Comments
COMMENT ON TABLE properties IS 'Property information and cached valuations';
COMMENT ON TABLE analysis_results IS 'Complete jeonse safety analysis results';
COMMENT ON TABLE transaction_cache IS 'Cached transaction data from MOLIT and other sources';
COMMENT ON TABLE building_register_cache IS 'Cached building register data (건축물대장)';
COMMENT ON TABLE uploaded_documents IS 'User-uploaded documents like 등기부등본';
