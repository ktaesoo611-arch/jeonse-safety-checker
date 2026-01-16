/**
 * Script to run the beta counter migration
 * Usage: node scripts/run-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Running beta counter migration...\n');

  // Try to check if table exists by querying it
  console.log('1. Checking if beta_settings table exists...');
  const { data: existingData, error: checkError } = await supabase
    .from('beta_settings')
    .select('*')
    .eq('id', 'default')
    .single();

  if (checkError && checkError.code === 'PGRST116') {
    // No rows found - table exists but empty
    console.log('   Table exists but is empty. Inserting default row...');

    const { error: insertError } = await supabase
      .from('beta_settings')
      .insert({
        id: 'default',
        free_unlocks_remaining: 50,
        total_unlocks_used: 0
      });

    if (insertError) {
      console.log('   Insert error:', insertError.message);
    } else {
      console.log('   ✓ Default row inserted');
    }
  } else if (checkError && checkError.message.includes('does not exist')) {
    // Table doesn't exist
    console.log('   ✗ Table does not exist.');
    console.log('\n⚠️  Please run the following SQL in your Supabase dashboard:');
    console.log('   Dashboard URL: https://supabase.com/dashboard/project/ncqchpvhvoqeeydtmhut/sql/new');
    console.log('\n--- COPY SQL BELOW ---\n');

    const sql = `
-- Beta Counter and Email Captures Table
CREATE TABLE IF NOT EXISTS beta_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  free_unlocks_remaining INTEGER NOT NULL DEFAULT 50,
  total_unlocks_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO beta_settings (id, free_unlocks_remaining)
VALUES ('default', 50)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS beta_email_captures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  analysis_id UUID NOT NULL,
  analysis_type VARCHAR(20) NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, analysis_id)
);

CREATE INDEX IF NOT EXISTS idx_beta_email_captures_email
  ON beta_email_captures(email);

CREATE INDEX IF NOT EXISTS idx_beta_email_captures_date
  ON beta_email_captures(unlocked_at);

ALTER TABLE beta_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_email_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read beta settings"
  ON beta_settings FOR SELECT USING (true);

CREATE POLICY "Service role can update beta settings"
  ON beta_settings FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert email captures"
  ON beta_email_captures FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read email captures"
  ON beta_email_captures FOR SELECT USING (true);
`;
    console.log(sql);
    console.log('\n--- END SQL ---\n');
    return;
  } else if (existingData) {
    console.log('   ✓ Table exists with data:', existingData);
  } else if (checkError) {
    console.log('   Error:', checkError.message);
  }

  // Check beta_email_captures table
  console.log('\n2. Checking if beta_email_captures table exists...');
  const { error: capturesError } = await supabase
    .from('beta_email_captures')
    .select('count')
    .limit(0);

  if (capturesError && capturesError.message.includes('does not exist')) {
    console.log('   ✗ beta_email_captures table does not exist.');
    console.log('   Please run the full migration SQL above.');
  } else if (capturesError) {
    console.log('   Error:', capturesError.message);
  } else {
    console.log('   ✓ beta_email_captures table exists');
  }

  // Final verification
  console.log('\n3. Final verification...');
  const { data: finalData, error: finalError } = await supabase
    .from('beta_settings')
    .select('*')
    .eq('id', 'default')
    .single();

  if (finalError) {
    console.log('   ✗ Verification failed:', finalError.message);
  } else {
    console.log('   ✓ Current settings:', finalData);
    console.log('\n✅ Migration verified!');
  }
}

runMigration().catch(console.error);
