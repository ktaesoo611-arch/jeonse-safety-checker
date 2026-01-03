/**
 * Test Market Trend Score calculation for 금천현대 59㎡
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function scoreMarketConditions(valuation: { confidence: number; marketTrend: string }): {
  score: number;
  breakdown: string[];
} {
  const breakdown: string[] = [];
  let score = 70; // Base score
  breakdown.push(`Base score: 70`);

  const confidence = valuation.confidence;
  const isHighConfidence = confidence >= 0.7;
  const isMediumConfidence = confidence >= 0.4 && confidence < 0.7;
  const isLowConfidence = confidence < 0.4;

  breakdown.push(`Confidence: ${confidence} (${isHighConfidence ? 'HIGH' : isMediumConfidence ? 'MEDIUM' : 'LOW'})`);

  // Apply trend with confidence-based magnitude
  if (valuation.marketTrend === 'rising') {
    if (isHighConfidence) {
      score += 25;
      breakdown.push(`Rising trend (high conf): +25`);
    } else if (isMediumConfidence) {
      score += 15;
      breakdown.push(`Rising trend (medium conf): +15`);
    } else {
      score += 8;
      breakdown.push(`Rising trend (low conf): +8`);
    }
  } else if (valuation.marketTrend === 'falling') {
    if (isHighConfidence) {
      score -= 35;
      breakdown.push(`Falling trend (high conf): -35`);
    } else if (isMediumConfidence) {
      score -= 25;
      breakdown.push(`Falling trend (medium conf): -25`);
    } else {
      score -= 15;
      breakdown.push(`Falling trend (low conf): -15`);
    }
  } else {
    breakdown.push(`Stable trend: +0`);
  }

  // Low confidence penalty
  if (isLowConfidence) {
    score -= 10;
    breakdown.push(`Low confidence penalty: -10`);
  }

  const finalScore = Math.max(0, Math.min(100, score));
  breakdown.push(`Final score: ${finalScore}`);

  return { score: finalScore, breakdown };
}

async function testMarketScore() {
  const analysisId = '58110535-f3a8-4267-917c-d6b753ffe2d3';

  console.log('='.repeat(80));
  console.log('🔍 Testing Market Trend Score');
  console.log('   Property: 금천현대 59㎡ (금천구 독산동)');
  console.log(`   Analysis ID: ${analysisId}`);
  console.log('='.repeat(80));

  // Fetch analysis data
  const { data: analysis, error } = await supabase
    .from('analysis_results')
    .select('deunggibu_data')
    .eq('id', analysisId)
    .single();

  if (error || !analysis) {
    console.error('Error fetching analysis:', error);
    return;
  }

  const dd = analysis.deunggibu_data;
  const valuation = dd?.valuation;

  if (!valuation) {
    console.log('❌ No valuation data found');
    return;
  }

  console.log('\n📊 Valuation Data:');
  console.log(`  valueLow: ${valuation.valueLow ? (valuation.valueLow / 100000000).toFixed(2) + '억' : 'N/A'}`);
  console.log(`  valueMid: ${valuation.valueMid ? (valuation.valueMid / 100000000).toFixed(2) + '억' : 'N/A'}`);
  console.log(`  valueHigh: ${valuation.valueHigh ? (valuation.valueHigh / 100000000).toFixed(2) + '억' : 'N/A'}`);
  console.log(`  confidence: ${valuation.confidence}`);
  console.log(`  marketTrend: ${valuation.marketTrend}`);

  console.log('\n📈 Market Score Calculation:');
  const { score, breakdown } = scoreMarketConditions({
    confidence: valuation.confidence || 0.5,
    marketTrend: valuation.marketTrend || 'stable'
  });

  breakdown.forEach(line => console.log(`  ${line}`));

  console.log('\n📊 Stored Scores:');
  console.log(`  marketScore (stored): ${dd.scores?.marketScore || dd.marketScore || 'N/A'}`);
  console.log(`  marketScore (calculated): ${score}`);

  // Show all component scores
  console.log('\n📊 All Component Scores:');
  console.log(`  LTV Score: ${dd.scores?.ltvScore || dd.ltvScore || 'N/A'}`);
  console.log(`  Legal Score: ${dd.scores?.legalScore || dd.legalScore || 'N/A'}`);
  console.log(`  Market Score: ${dd.scores?.marketScore || dd.marketScore || 'N/A'}`);
  console.log(`  Building Score: ${dd.scores?.buildingScore || dd.buildingScore || 'N/A'}`);

  // Calculate overall score
  const ltvScore = dd.scores?.ltvScore || dd.ltvScore || 0;
  const legalScore = dd.scores?.legalScore || dd.legalScore || 0;
  const marketScore = dd.scores?.marketScore || dd.marketScore || 0;
  const buildingScore = dd.scores?.buildingScore || dd.buildingScore || 0;

  const overallScore = Math.round(
    ltvScore * 0.40 +
    legalScore * 0.30 +
    marketScore * 0.15 +
    buildingScore * 0.15
  );

  console.log('\n📊 Overall Score Calculation:');
  console.log(`  LTV (40%): ${ltvScore} × 0.40 = ${(ltvScore * 0.40).toFixed(1)}`);
  console.log(`  Legal (30%): ${legalScore} × 0.30 = ${(legalScore * 0.30).toFixed(1)}`);
  console.log(`  Market (15%): ${marketScore} × 0.15 = ${(marketScore * 0.15).toFixed(1)}`);
  console.log(`  Building (15%): ${buildingScore} × 0.15 = ${(buildingScore * 0.15).toFixed(1)}`);
  console.log(`  ────────────────────────────────`);
  console.log(`  Overall Score: ${overallScore}`);
}

testMarketScore().catch(console.error);
