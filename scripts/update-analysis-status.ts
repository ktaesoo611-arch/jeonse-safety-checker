import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const analysisId = process.argv[2];
const status = process.argv[3] || 'failed';
const message = process.argv[4] || 'Analysis cancelled';

async function main() {
  if (!analysisId) {
    console.log('Usage: npx tsx scripts/update-analysis-status.ts <analysisId> [status] [message]');
    process.exit(1);
  }

  const { error } = await client
    .from('analysis_results')
    .update({ status })
    .eq('id', analysisId);

  console.log(error ? `Error: ${error.message}` : `Updated analysis ${analysisId} to status: ${status}`);
}

main();
