import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ncqchpvhvoqeeydtmhut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcWNocHZodm9xZWV5ZHRtaHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTEzOTIsImV4cCI6MjA3ODI2NzM5Mn0.MZaXYLb8OTtrRc9rh3gHTGbylIMa5JVsscTLxlxXyfQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnalysisData() {
  const analysisId = 'dd683182-ad7e-44bb-8447-58292959e4ba';

  console.log('Querying analysis:', analysisId);

  // Query analysis_results table with properties
  const { data: analysis, error: analysisError } = await supabase
    .from('analysis_results')
    .select(`
      *,
      properties (*)
    `)
    .eq('id', analysisId)
    .single();

  if (analysisError) {
    console.error('Error querying analysis_results:', analysisError);
    console.error('Error details:', JSON.stringify(analysisError, null, 2));
    return;
  }

  if (!analysis) {
    console.error('No analysis found with ID:', analysisId);
    return;
  }

  console.log('\n=== Database Record ===');
  console.log('Analysis ID:', analysis.id);
  console.log('Status:', analysis.status);
  console.log('Created at:', analysis.created_at);
  console.log('Completed at:', analysis.completed_at);
  console.log('Proposed Jeonse (DB):', analysis.proposed_jeonse?.toLocaleString('ko-KR'));

  // Property info
  const property = Array.isArray(analysis.properties) ? analysis.properties[0] : analysis.properties;
  if (property) {
    console.log('\n=== Property Data ===');
    console.log('Address:', property.address);
    console.log('Building Name:', property.building_name);
  }

  // Parse deunggibu_data JSON (this is where the risk analysis is stored)
  if (analysis.deunggibu_data) {
    const riskData = analysis.deunggibu_data;
    console.log('\n=== Risk Analysis Data (from deunggibu_data) ===');

    if (riskData.valuation) {
      console.log('Valuation valueMid:', riskData.valuation.valueMid?.toLocaleString('ko-KR'));
      console.log('Valuation valueLow:', riskData.valuation.valueLow?.toLocaleString('ko-KR'));
      console.log('Valuation valueHigh:', riskData.valuation.valueHigh?.toLocaleString('ko-KR'));
      console.log('Confidence:', riskData.valuation.confidence);
    }

    // Check if there's a proposedJeonse in the risk data
    if (riskData.deunggibu) {
      console.log('\n=== Deunggibu Section ===');
      console.log('Address:', riskData.deunggibu.address);
      console.log('Building Name:', riskData.deunggibu.buildingName);
      console.log('Area:', riskData.deunggibu.area);
      console.log('Mortgages:', riskData.deunggibu.mortgages?.length || 0);
      console.log('Total Mortgage Amount:', riskData.deunggibu.totalMortgageAmount?.toLocaleString('ko-KR'));
    }

    // Check calculation
    const proposedJeonse = analysis.proposed_jeonse;
    const estimatedValue = riskData.valuation?.valueMid;

    if (proposedJeonse && estimatedValue) {
      const calculatedValue = Math.round(proposedJeonse / 0.70);

      console.log('\n=== Calculation Check ===');
      console.log('Proposed Jeonse (from DB):', `₩${(proposedJeonse / 100000000).toFixed(2)}억`);
      console.log('Estimated Value (displayed):', `₩${(estimatedValue / 100000000).toFixed(2)}억`);
      console.log('Expected (proposed / 0.70):', `₩${(calculatedValue / 100000000).toFixed(2)}억`);
      console.log('Match:', calculatedValue === estimatedValue ? '✓ YES' : '✗ NO');

      if (Math.abs(calculatedValue - estimatedValue) > 1000) {
        console.log('\n⚠️  MISMATCH DETECTED!');
        console.log(`If estimated value is ₩${(estimatedValue / 100000000).toFixed(2)}억,`);
        console.log(`then proposed jeonse should be: ₩${(Math.round(estimatedValue * 0.70) / 100000000).toFixed(2)}억`);
        console.log(`But DB has proposed jeonse: ₩${(proposedJeonse / 100000000).toFixed(2)}억`);
        console.log(`\nDifference: The system seems to be using ₩${(Math.round(estimatedValue * 0.70) / 100000000).toFixed(2)}억 instead of ₩${(proposedJeonse / 100000000).toFixed(2)}억 for calculation`);
      }
    }
  } else {
    console.warn('No deunggibu_data found in analysis');
  }
}

checkAnalysisData();
