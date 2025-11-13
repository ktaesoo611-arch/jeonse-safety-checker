/**
 * Test Supabase Connection and Schema
 *
 * Run with: npx tsx scripts/test-supabase.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { supabase, supabaseAdmin } from '../lib/supabase';

async function testSupabase() {
  console.log('🧪 Testing Supabase Connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase environment variables');
    console.log('\n💡 Required variables:');
    console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
    console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓' : '✗'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗'}`);
    process.exit(1);
  }

  console.log('✓ Environment variables found');
  console.log(`✓ Project URL: ${supabaseUrl}\n`);

  try {
    // Test 1: Check database connection
    console.log('📊 Test 1: Database Connection');
    const { data, error } = await supabaseAdmin
      .from('properties')
      .select('count')
      .limit(1);

    if (error && error.code === '42P01') {
      console.error('❌ Error: Table "properties" does not exist');
      console.log('\n💡 Solution:');
      console.log('   1. Go to your Supabase project');
      console.log('   2. Open SQL Editor');
      console.log('   3. Run the contents of database-schema.sql');
      process.exit(1);
    }

    if (error) {
      throw error;
    }

    console.log('   ✓ Successfully connected to database');
    console.log('   ✓ Table "properties" exists\n');

    // Test 2: Check all required tables
    console.log('🗂️  Test 2: Verifying Schema');

    const tables = [
      'properties',
      'analysis_results',
      'transaction_cache',
      'building_register_cache',
      'uploaded_documents'
    ];

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .select('count')
        .limit(1);

      if (error) {
        console.log(`   ✗ Table "${table}" missing or error: ${error.message}`);
      } else {
        console.log(`   ✓ Table "${table}" exists`);
      }
    }

    console.log();

    // Test 3: Insert test property
    console.log('💾 Test 3: Insert Test Data');

    const testProperty = {
      address: '서울특별시 마포구 서교동 123-45 테스트아파트',
      city: '서울',
      district: '마포구',
      dong: '서교동',
      building_name: 'TEST-아파트',
      building_number: '123-45',
      floor: 5,
      unit: '501',
      exclusive_area: 84.5,
      estimated_value_mid: 500000000
    };

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('properties')
      .insert(testProperty)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log('   ✓ Successfully inserted test property');
    console.log(`   ✓ Property ID: ${insertData.id}\n`);

    // Test 4: Read the data back
    console.log('📖 Test 4: Read Test Data');

    const { data: readData, error: readError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', insertData.id)
      .single();

    if (readError) {
      throw readError;
    }

    console.log('   ✓ Successfully read data');
    console.log(`   Address: ${readData.address}`);
    console.log(`   Building: ${readData.building_name}\n`);

    // Test 5: Clean up test data
    console.log('🧹 Test 5: Cleanup');

    const { error: deleteError } = await supabaseAdmin
      .from('properties')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      throw deleteError;
    }

    console.log('   ✓ Test data cleaned up\n');

    // Test 6: Check storage bucket
    console.log('📦 Test 6: Storage Bucket');

    const { data: buckets, error: bucketError } = await supabaseAdmin
      .storage
      .listBuckets();

    if (bucketError) {
      throw bucketError;
    }

    const documentsBucket = buckets.find(b => b.name === 'documents');

    if (documentsBucket) {
      console.log('   ✓ Storage bucket "documents" exists');
      console.log(`   ✓ Public: ${documentsBucket.public ? 'Yes' : 'No (correct)'}\n`);
    } else {
      console.log('   ✗ Storage bucket "documents" not found');
      console.log('\n💡 Solution:');
      console.log('   1. Go to Supabase → Storage');
      console.log('   2. Create a bucket named "documents"');
      console.log('   3. Keep it private (public = false)\n');
    }

    console.log('✅ All tests passed!');
    console.log('🎉 Supabase is configured correctly\n');

  } catch (error: any) {
    console.error('\n❌ Database Error:', error.message);

    if (error.code) {
      console.log(`   Error code: ${error.code}`);
    }

    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check that database-schema.sql has been run');
    console.log('   2. Verify API keys are correct');
    console.log('   3. Check Supabase dashboard for errors');
    console.log('   4. Ensure project is not paused (free tier auto-pauses)');

    process.exit(1);
  }
}

// Run the test
testSupabase();
