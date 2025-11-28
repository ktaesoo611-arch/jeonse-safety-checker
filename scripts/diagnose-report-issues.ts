/**
 * Comprehensive diagnostic to check why report sections aren't working
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function diagnoseReportIssues() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the most recent completed analysis
  const { data: analyses, error } = await supabase
    .from('analysis_results')
    .select(`
      *,
      properties (*)
    `)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching analysis:', error);
    return;
  }

  if (!analyses || analyses.length === 0) {
    console.log('❌ No completed analyses found');
    return;
  }

  const analysis = analyses[0];
  const riskAnalysis = analysis.deunggibu_data;

  console.log('\n' + '='.repeat(80));
  console.log('📊 REPORT DATA DIAGNOSTIC');
  console.log('='.repeat(80) + '\n');

  console.log(`Analysis ID: ${analysis.id}`);
  console.log(`Created: ${analysis.created_at}`);
  console.log(`Status: ${analysis.status}`);
  console.log(`Safety Score: ${analysis.safety_score}`);
  console.log(`Risk Level: ${analysis.risk_level}\n`);

  // Check each section that should appear in the report
  const checks = {
    '1. Property Information': {
      'properties table exists': !!analysis.properties,
      'address': analysis.properties?.address || 'MISSING',
      'building_name': analysis.properties?.building_name || 'MISSING',
      'proposed_jeonse': analysis.proposed_jeonse || 'MISSING'
    },
    '2. Overall Score': {
      'overallScore': riskAnalysis?.overallScore || 'MISSING',
      'riskLevel': riskAnalysis?.riskLevel || 'MISSING',
      'verdict': riskAnalysis?.verdict ? '✓ EXISTS' : 'MISSING'
    },
    '3. Component Scores (Detailed Scores)': {
      'scores object exists': !!riskAnalysis?.scores,
      'ltvScore': riskAnalysis?.scores?.ltvScore || riskAnalysis?.ltvScore || 'MISSING',
      'debtScore': riskAnalysis?.scores?.debtScore || riskAnalysis?.debtScore || 'MISSING',
      'legalScore': riskAnalysis?.scores?.legalScore || riskAnalysis?.legalScore || 'MISSING',
      'marketScore': riskAnalysis?.scores?.marketScore || riskAnalysis?.marketScore || 'MISSING',
      'buildingScore': riskAnalysis?.scores?.buildingScore || riskAnalysis?.buildingScore || 'MISSING'
    },
    '4. Property Valuation': {
      'valuation object exists': !!riskAnalysis?.valuation,
      'valueMid': riskAnalysis?.valuation?.valueMid || 'MISSING',
      'valueLow': riskAnalysis?.valuation?.valueLow || 'MISSING',
      'valueHigh': riskAnalysis?.valuation?.valueHigh || 'MISSING',
      'confidence': riskAnalysis?.valuation?.confidence || 'MISSING',
      'marketTrend': riskAnalysis?.valuation?.marketTrend || 'MISSING'
    },
    '5. Deunggibu Property Details': {
      'deunggibu object exists': !!riskAnalysis?.deunggibu,
      'address': riskAnalysis?.deunggibu?.address || 'MISSING',
      'buildingName': riskAnalysis?.deunggibu?.buildingName || 'MISSING',
      'area': riskAnalysis?.deunggibu?.area || 'MISSING',
      'owner': riskAnalysis?.deunggibu?.owner || 'MISSING'
    },
    '6. Financial Metrics': {
      'ltv': riskAnalysis?.ltv || 'MISSING',
      'totalDebt': riskAnalysis?.totalDebt || 'MISSING',
      'availableEquity': riskAnalysis?.availableEquity || 'MISSING'
    },
    '7. Detected Risks': {
      'risks array exists': !!riskAnalysis?.risks,
      'risks count': riskAnalysis?.risks?.length || 0,
      'has risks': (riskAnalysis?.risks?.length || 0) > 0 ? '✓ YES' : '❌ NO'
    },
    '8. Debt Ranking': {
      'debtRanking array exists': !!riskAnalysis?.debtRanking,
      'debtRanking count': riskAnalysis?.debtRanking?.length || 0,
      'has debts': (riskAnalysis?.debtRanking?.length || 0) > 0 ? '✓ YES' : '❌ NO'
    },
    '9. Recommendations': {
      'recommendations object exists': !!riskAnalysis?.recommendations,
      'mandatory count': riskAnalysis?.recommendations?.mandatory?.length || 0,
      'recommended count': riskAnalysis?.recommendations?.recommended?.length || 0,
      'optional count': riskAnalysis?.recommendations?.optional?.length || 0
    },
    '10. Small Amount Priority': {
      'smallAmountPriority exists': !!riskAnalysis?.smallAmountPriority,
      'region': riskAnalysis?.smallAmountPriority?.region || 'MISSING',
      'threshold': riskAnalysis?.smallAmountPriority?.threshold || 'MISSING',
      'isEligible': riskAnalysis?.smallAmountPriority?.isEligible ?? 'MISSING'
    }
  };

  // Print results
  for (const [section, items] of Object.entries(checks)) {
    console.log(`\n${section}`);
    console.log('-'.repeat(80));
    for (const [key, value] of Object.entries(items)) {
      const status = value === 'MISSING' ? '❌' :
                     value === '✓ YES' ? '✅' :
                     value === '✓ EXISTS' ? '✅' :
                     value === '❌ NO' ? '❌' : '✓';
      const displayValue = typeof value === 'number' ? value :
                          typeof value === 'boolean' ? (value ? 'true' : 'false') :
                          value;
      console.log(`  ${status} ${key}: ${displayValue}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 ISSUES SUMMARY');
  console.log('='.repeat(80) + '\n');

  const issues: string[] = [];

  if (!riskAnalysis?.valuation) {
    issues.push('❌ CRITICAL: Property valuation missing (MOLIT API likely timed out)');
  }

  if (!riskAnalysis?.deunggibu) {
    issues.push('❌ CRITICAL: Deunggibu property details missing');
  }

  if (!riskAnalysis?.scores && !riskAnalysis?.ltvScore) {
    issues.push('❌ CRITICAL: Component scores missing entirely');
  } else if (riskAnalysis?.scores) {
    issues.push('✅ Component scores exist in nested structure (fixed in latest deployment)');
  }

  if (!riskAnalysis?.risks || riskAnalysis.risks.length === 0) {
    issues.push('⚠️  WARNING: No risks detected (unusual)');
  }

  if (!riskAnalysis?.debtRanking || riskAnalysis.debtRanking.length === 0) {
    issues.push('⚠️  WARNING: No debt ranking (unusual if there are mortgages)');
  }

  if (issues.length === 0) {
    console.log('✅ All data present! Report should display correctly.\n');
  } else {
    issues.forEach(issue => console.log(issue));
    console.log();
  }

  // Check what should be fixed
  console.log('🔧 RECOMMENDED FIXES:\n');

  if (!riskAnalysis?.valuation) {
    console.log('1. Property Valuation:');
    console.log('   - Already increased MOLIT timeout to 30s');
    console.log('   - Run new analysis to test');
    console.log('   - Check Vercel logs for MOLIT API errors\n');
  }

  if (!riskAnalysis?.deunggibu) {
    console.log('2. Deunggibu Property Details:');
    console.log('   - Check document parsing is working');
    console.log('   - Verify deunggibuData variable is populated');
    console.log('   - Check database save operation in parse route\n');
  }
}

diagnoseReportIssues();
