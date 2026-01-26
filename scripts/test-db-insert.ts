import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Test insert into uploaded_documents
  const testData = {
    analysis_id: 'b4a64ed2-8645-4833-b063-a4acc44c13d8',
    document_type: 'deunggibu-codef',
    original_filename: 'test.json',
    file_path: '',
    parsed_data: { test: true },
    ocr_text: '{}',
    created_at: new Date().toISOString(),
  };

  console.log('Testing insert with:', testData);

  const { data, error } = await client
    .from('uploaded_documents')
    .insert(testData)
    .select()
    .single();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success:', data.id);

    // Clean up test
    await client.from('uploaded_documents').delete().eq('id', data.id);
    console.log('Cleaned up test record');
  }
}

main();
