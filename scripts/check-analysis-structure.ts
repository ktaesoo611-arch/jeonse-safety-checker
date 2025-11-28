/**
 * Check the structure of analysis data to debug missing sections
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function checkAnalysisStructure() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the most recent completed analysis
  const { data: analyses, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching analysis:', error);
    return;
  }

  if (!analyses || analyses.length === 0) {
    console.log('No completed analyses found');
    return;
  }

  const analysis = analyses[0];
  console.log('\n📊 Most Recent Completed Analysis:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`ID: ${analysis.id}`);
  console.log(`Status: ${analysis.status}`);
  console.log(`Safety Score: ${analysis.safety_score}`);
  console.log(`Risk Level: ${analysis.risk_level}`);
  console.log(`Created: ${analysis.created_at}`);
  console.log(`Completed: ${analysis.completed_at}`);

  console.log('\n\n🔍 deunggibu_data Structure:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!analysis.deunggibu_data) {
    console.log('❌ deunggibu_data is NULL or undefined!');
    return;
  }

  const data = analysis.deunggibu_data;
  console.log('Top-level keys:', Object.keys(data));

  // Check for critical fields
  console.log('\n📈 Scores:');
  console.log(`  - overallScore: ${data.overallScore}`);
  console.log(`  - ltvScore: ${data.ltvScore}`);
  console.log(`  - debtScore: ${data.debtScore}`);
  console.log(`  - legalScore: ${data.legalScore}`);
  console.log(`  - marketScore: ${data.marketScore}`);
  console.log(`  - buildingScore: ${data.buildingScore}`);

  console.log('\n💰 Financial Metrics:');
  console.log(`  - ltv: ${data.ltv}`);
  console.log(`  - ltvRatio: ${data.ltvRatio}`);
  console.log(`  - totalDebt: ${data.totalDebt}`);
  console.log(`  - availableEquity: ${data.availableEquity}`);

  console.log('\n🏢 Valuation:');
  console.log(`  - valuation exists: ${!!data.valuation}`);
  if (data.valuation) {
    console.log(`    - valueLow: ${data.valuation.valueLow}`);
    console.log(`    - valueMid: ${data.valuation.valueMid}`);
    console.log(`    - valueHigh: ${data.valuation.valueHigh}`);
    console.log(`    - confidence: ${data.valuation.confidence}`);
    console.log(`    - marketTrend: ${data.valuation.marketTrend}`);
  }

  console.log('\n⚠️  Risks:');
  console.log(`  - risks array exists: ${!!data.risks}`);
  console.log(`  - risks count: ${data.risks?.length || 0}`);
  if (data.risks && data.risks.length > 0) {
    data.risks.forEach((risk: any, i: number) => {
      console.log(`    ${i + 1}. [${risk.severity}] ${risk.category}: ${risk.description}`);
    });
  }

  console.log('\n📋 Debt Ranking:');
  console.log(`  - debtRanking exists: ${!!data.debtRanking}`);
  console.log(`  - debtRanking count: ${data.debtRanking?.length || 0}`);
  if (data.debtRanking && data.debtRanking.length > 0) {
    data.debtRanking.forEach((debt: any, i: number) => {
      console.log(`    ${i + 1}. [Priority ${debt.priority}] ${debt.type}: ₩${(debt.amount / 100000000).toFixed(2)}억`);
    });
  }

  console.log('\n🏗️  Deunggibu Data:');
  console.log(`  - deunggibu exists: ${!!data.deunggibu}`);
  if (data.deunggibu) {
    console.log(`    - address: ${data.deunggibu.address}`);
    console.log(`    - buildingName: ${data.deunggibu.buildingName}`);
    console.log(`    - area: ${data.deunggibu.area}`);
    console.log(`    - owner: ${data.deunggibu.owner}`);
  }

  console.log('\n💡 Recommendations:');
  console.log(`  - recommendations exists: ${!!data.recommendations}`);
  if (data.recommendations) {
    console.log(`    - mandatory: ${data.recommendations.mandatory?.length || 0} items`);
    console.log(`    - recommended: ${data.recommendations.recommended?.length || 0} items`);
    console.log(`    - optional: ${data.recommendations.optional?.length || 0} items`);
  }

  console.log('\n\n📄 Full deunggibu_data JSON:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(JSON.stringify(data, null, 2));
}

checkAnalysisStructure();
