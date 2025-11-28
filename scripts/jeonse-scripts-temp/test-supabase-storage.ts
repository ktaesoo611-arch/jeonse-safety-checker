/**
 * Test Supabase Storage Setup
 *
 * This script checks if the 'documents' storage bucket exists
 * and creates it if necessary.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStorageSetup() {
  console.log('🔍 Testing Supabase Storage setup...\n');

  try {
    // List all buckets
    console.log('📦 Listing storage buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      throw listError;
    }

    console.log(`Found ${buckets.length} bucket(s):`);
    buckets.forEach((bucket) => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    console.log('');

    // Check if 'documents' bucket exists
    const documentsBucket = buckets.find(b => b.name === 'documents');

    if (!documentsBucket) {
      console.log('⚠️  "documents" bucket not found. Creating it...');

      const { data: newBucket, error: createError } = await supabase.storage.createBucket('documents', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf']
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        throw createError;
      }

      console.log('✅ Created "documents" bucket successfully');
    } else {
      console.log('✅ "documents" bucket exists');
      console.log(`   - Public: ${documentsBucket.public}`);
      console.log(`   - File size limit: ${documentsBucket.file_size_limit || 'unlimited'}`);
    }

    // Test upload
    console.log('\n🧪 Testing file upload...');
    const testFile = Buffer.from('Test PDF content');
    const testPath = 'test/test-upload.pdf';

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testPath, testFile, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      throw uploadError;
    }

    console.log('✅ Upload test successful');
    console.log(`   Path: ${uploadData.path}`);

    // Clean up test file
    await supabase.storage.from('documents').remove([testPath]);
    console.log('✅ Test file cleaned up');

    console.log('\n✅ All storage tests passed!');
    console.log('The Supabase Storage is configured correctly.\n');

  } catch (error) {
    console.error('\n❌ Storage test failed');
    console.error('Error:', error);
    process.exit(1);
  }
}

testStorageSetup();
