import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await client
    .from('analysis_results')
    .select('id, status, property_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Recent analyses:');
  for (const row of data || []) {
    console.log(`  ${row.id} | ${row.status} | ${row.property_id} | ${row.created_at}`);
  }
}

main();
