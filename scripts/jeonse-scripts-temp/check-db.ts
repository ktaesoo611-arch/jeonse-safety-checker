import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAnalysis(id: string) {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('id, status, safety_score, risk_level, deunggibu_data')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Analysis ID:', data.id);
  console.log('Status:', data.status);
  console.log('Safety Score:', data.safety_score);
  console.log('Risk Level:', data.risk_level);
  console.log('Has deunggibu_data:', !!data.deunggibu_data);

  if (data.deunggibu_data) {
    console.log('deunggibu_data keys:', Object.keys(data.deunggibu_data));
    console.log('deunggibu_data.ltv:', data.deunggibu_data.ltv);
    console.log('deunggibu_data.overallScore:', data.deunggibu_data.overallScore);
  } else {
    console.log('❌ deunggibu_data is NULL');
  }
}

const analysisId = process.argv[2] || '1485850b-9cf6-4edc-966c-87933b57d5c8';
checkAnalysis(analysisId);
