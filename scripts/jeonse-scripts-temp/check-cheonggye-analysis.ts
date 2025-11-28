/**
 * Check actual stored valuation for 청계한신휴플러스
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkAnalysis() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find property first
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, building_name, address')
    .eq('building_name', '청계한신휴플러스')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (propError || !property) {
    console.error('Property not found:', propError);
    return;
  }

  console.log('Property Found:');
  console.log('  ID:', property.id);
  console.log('  Building:', property.building_name);
  console.log('  Address:', property.address);

  // Find most recent analysis for this property
  const { data: analysis, error: analysisError } = await supabase
    .from('analysis_results')
    .select('id, status, safety_score, deunggibu_data, created_at, proposed_jeonse')
    .eq('property_id', property.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (analysisError || !analysis) {
    console.error('Analysis not found:', analysisError);
    return;
  }

  console.log('\nAnalysis Found:');
  console.log('  ID:', analysis.id);
  console.log('  Created:', analysis.created_at);
  console.log('  Status:', analysis.status);
  console.log('  Safety Score:', analysis.safety_score);
  console.log('  Proposed Jeonse:', `₩${(analysis.proposed_jeonse / 100000000).toFixed(1)}억`);

  console.log('\n=== Valuation Data ===');
  const valuation = analysis.deunggibu_data?.valuation;

  if (valuation) {
    console.log(JSON.stringify(valuation, null, 2));

    console.log('\n=== Formatted ===');
    console.log('Est. Market Value: ₩' + (valuation.valueMid / 100000000).toFixed(1) + '억');
    console.log('Exact value: ₩' + valuation.valueMid.toLocaleString());
    console.log('Value Low: ₩' + (valuation.valueLow / 100000000).toFixed(1) + '억');
    console.log('Value High: ₩' + (valuation.valueHigh / 100000000).toFixed(1) + '억');
    console.log('Confidence:', valuation.confidence);
    console.log('Market Trend:', valuation.marketTrend);
  } else {
    console.log('No valuation data found');
  }
}

checkAnalysis();
