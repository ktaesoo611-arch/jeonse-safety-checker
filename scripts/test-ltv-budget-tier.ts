/**
 * Test: Verify LTV uses Budget tier for safety scoring
 *
 * Issue #1: LTV should use Budget tier (conservative) for safety scoring
 * Issue #2: User tier selection should NOT affect safety score
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PropertyValuationEngine } from '../lib/analyzers/property-valuation';
import { RiskAnalyzer, PropertyValuation } from '../lib/analyzers/risk-analyzer';
import { DeunggibuData } from '../lib/types';

const apiKey = process.env.MOLIT_API_KEY;
if (!apiKey) {
  console.error('MOLIT_API_KEY not set');
  process.exit(1);
}

async function testLTVBudgetTier() {
  const engine = new PropertyValuationEngine(apiKey!);
  const riskAnalyzer = new RiskAnalyzer();

  // Test case: 홍익동 367, 27.45㎡
  // Actual: 2.8억, Traditional estimate: 3.39억, Budget tier: 2.96억
  const property = {
    address: '서울특별시 성동구 홍익동 367',
    city: '서울특별시',
    district: '성동구',
    dong: '홍익동',
    buildingName: '',
    buildingNumber: '367',
    floor: 2,
    unit: '',
    exclusiveArea: 27.45,
    buildingType: 'multifamily' as const,
    buildingYear: 0,
  };

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  TEST: LTV Uses Budget Tier for Safety Scoring');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Get valuation with tiered estimates
  const valuation = await engine.calculatePropertyValue(property, 'multifamily');

  console.log('\n─────────────────────────────────────────────────────────────────────────────────');
  console.log('  Valuation Results');
  console.log('─────────────────────────────────────────────────────────────────────────────────\n');

  console.log('Traditional (valueMid):', (valuation.valueMid / 100000000).toFixed(2) + '억');

  if (valuation.tierEstimates) {
    console.log('\nTiered Estimates:');
    for (const t of valuation.tierEstimates) {
      console.log(`  ${t.label}: ${(t.value / 100000000).toFixed(2)}억`);
    }
  }

  // Mock deunggibu data (no existing debt for simplicity)
  const mockDeunggibu: DeunggibuData = {
    address: property.address,
    area: property.exclusiveArea,
    ownership: [{ ownerName: 'Test Owner', ownershipPercentage: 100, registrationDate: '2020-01-01', acquisitionMethod: '매매' }],
    ownershipChanges: 0,
    mortgages: [],
    totalMortgageAmount: 0,
    totalEstimatedPrincipal: 0,
    liens: [],
    hasSeizure: false,
    hasProvisionalSeizure: false,
    hasAuction: false,
    jeonseRights: [],
    hasSuperficies: false,
    hasEasement: false,
    hasProvisionalRegistration: false,
    hasProvisionalDisposition: false,
    hasAdvanceNotice: false,
    hasUnregisteredLandRights: false,
    issueDate: '2025-01-01',
    documentNumber: 'TEST-001',
  };

  // Test with proposed jeonse of 2.5억
  const proposedJeonse = 250000000; // 2.5억

  // Create valuation object for risk analyzer
  const valuationForRisk: PropertyValuation = {
    valueLow: valuation.valueLow,
    valueMid: valuation.valueMid,
    valueHigh: valuation.valueHigh,
    confidence: valuation.confidence,
    marketTrend: valuation.trend,
    tierEstimates: valuation.tierEstimates,
  };

  // Run risk analysis
  const riskResult = riskAnalyzer.analyze(
    valuation.valueMid,
    proposedJeonse,
    mockDeunggibu,
    valuationForRisk,
    7 // building age
  );

  console.log('\n─────────────────────────────────────────────────────────────────────────────────');
  console.log('  Risk Analysis Results (Proposed Jeonse: 2.5억)');
  console.log('─────────────────────────────────────────────────────────────────────────────────\n');

  console.log('Safety Score:', riskResult.overallScore);
  console.log('Risk Level:', riskResult.riskLevel);
  console.log('');
  console.log('LTV (for safety scoring):', riskResult.ltv.toFixed(1) + '%');
  console.log('  → Uses Budget tier (conservative) for safety assessment');

  if (riskResult.ltvRange) {
    console.log('\nLTV Range (for display):');
    console.log(`  Optimistic (${riskResult.ltvRange.optimisticLabel}): ${riskResult.ltvRange.optimistic.toFixed(1)}%`);
    console.log(`  Moderate: ${riskResult.ltvRange.moderate.toFixed(1)}%`);
    console.log(`  Conservative (${riskResult.ltvRange.conservativeLabel}): ${riskResult.ltvRange.conservative.toFixed(1)}%`);
  }

  console.log('\nBreakdown:');
  console.log(`  Property Value (Budget tier): ${(riskResult.breakdown.totalPropertyValue / 100000000).toFixed(2)}억`);
  console.log(`  Proposed Jeonse: ${(riskResult.breakdown.proposedJeonse / 100000000).toFixed(2)}억`);
  console.log(`  Available Equity: ${(riskResult.breakdown.availableEquity / 100000000).toFixed(2)}억`);

  console.log('\n─────────────────────────────────────────────────────────────────────────────────');
  console.log('  Verification');
  console.log('─────────────────────────────────────────────────────────────────────────────────\n');

  // Verify Budget tier is used
  const budgetTier = valuation.tierEstimates?.find(t => t.tier === 'budget');
  if (budgetTier) {
    const expectedLTV = (proposedJeonse / budgetTier.value) * 100;
    const actualLTV = riskResult.ltv;

    console.log('Expected LTV (using Budget tier):');
    console.log(`  ${proposedJeonse / 100000000}억 / ${budgetTier.value / 100000000}억 = ${expectedLTV.toFixed(1)}%`);
    console.log('');
    console.log('Actual LTV from risk analyzer:', actualLTV.toFixed(1) + '%');
    console.log('');

    if (Math.abs(expectedLTV - actualLTV) < 0.1) {
      console.log('✅ PASS: LTV correctly uses Budget tier for safety scoring');
    } else {
      console.log('❌ FAIL: LTV does not match Budget tier calculation');
    }
  }

  // Compare with what LTV would be if using valueMid
  const ltvWithValueMid = (proposedJeonse / valuation.valueMid) * 100;
  console.log('');
  console.log('For comparison:');
  console.log(`  LTV if using valueMid: ${ltvWithValueMid.toFixed(1)}%`);
  console.log(`  LTV using Budget tier: ${riskResult.ltv.toFixed(1)}%`);
  console.log(`  Difference: ${(riskResult.ltv - ltvWithValueMid).toFixed(1)}pp (more conservative)`);

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
}

testLTVBudgetTier().catch(console.error);
