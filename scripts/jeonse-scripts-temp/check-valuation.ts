/**
 * Check stored valuation data for analysis
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkValuation() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('analysis_results')
    .select('id, status, deunggibu_data, completed_at')
    .eq('id', 'cc129670-b47e-4eee-ac97-97e90fdc3723')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Analysis ID:', data.id);
  console.log('Status:', data.status);
  console.log('Completed at:', data.completed_at);
  console.log('\n=== Valuation Data ===');
  console.log(JSON.stringify(data.deunggibu_data?.valuation, null, 2));

  if (data.deunggibu_data?.valuation) {
    const val = data.deunggibu_data.valuation;
    console.log('\n=== Breakdown ===');
    console.log('Value Mid (Est. Market Value):', val.valueMid?.toLocaleString(), '원');
    console.log('Confidence:', val.confidence);
    console.log('Market Trend:', val.marketTrend);
  }
}

checkValuation();
