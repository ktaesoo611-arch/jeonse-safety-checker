-- Payment System Schema for Toss Payments Integration
-- Run this in your Supabase SQL Editor AFTER running database-schema.sql

-- Payments table for tracking all payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Analysis reference
  analysis_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL,

  -- Toss Payments fields
  payment_key TEXT UNIQUE, -- Toss payment key (unique identifier)
  order_id TEXT NOT NULL UNIQUE, -- Our order ID
  order_name TEXT NOT NULL, -- Product name shown to user

  -- Payment details
  amount INTEGER NOT NULL, -- Amount in KRW (14900)
  currency TEXT DEFAULT 'KRW',
  method TEXT, -- 카드, 가상계좌, 간편결제, etc.

  -- Customer info
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, canceled, failed, refunded

  -- Toss response data
  approved_at TIMESTAMP,
  receipt_url TEXT,
  card_info JSONB, -- Card details if paid by card
  virtual_account_info JSONB, -- Virtual account details if used
  transfer_info JSONB, -- Transfer details if used
  mobile_phone_info JSONB, -- Mobile phone payment details if used

  -- Raw Toss API responses (for debugging)
  toss_response JSONB,
  toss_failure_code TEXT,
  toss_failure_message TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint to analysis_results
-- (Update existing payment fields to reference payments table)
ALTER TABLE analysis_results
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_analysis ON payments(analysis_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_key ON payments(payment_key);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Row Level Security (RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only view payments for their own analyses
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    analysis_id IN (
      SELECT id FROM analysis_results WHERE user_id = auth.uid()
    )
  );

-- Users can insert payments (needed for creating orders)
CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  WITH CHECK (
    analysis_id IN (
      SELECT id FROM analysis_results WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE payments IS 'Toss Payments transaction records';
COMMENT ON COLUMN payments.payment_key IS 'Toss Payments unique identifier for the payment';
COMMENT ON COLUMN payments.order_id IS 'Our internal order ID (UUID)';
COMMENT ON COLUMN payments.status IS 'pending: awaiting payment, approved: payment completed, canceled: user canceled, failed: payment failed, refunded: refund issued';
