/**
 * Test Risk Analyzer
 *
 * Tests the risk analysis engine with various scenarios
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { RiskAnalyzer } from '../lib/analyzers/risk-analyzer';
import { DeunggibuData } from '../lib/types';

function testRiskAnalyzer() {
  console.log('🧪 Testing Risk Analyzer\n');
  console.log('═'.repeat(70));

  const analyzer = new RiskAnalyzer();

  // Test Scenario 1: Safe property
  console.log('\n📋 TEST 1: SAFE Property (Low debt, no legal issues)\n');

  const safeDeunggibu: DeunggibuData = {
    address: '서울특별시 강남구 역삼동 123-45',
    buildingName: '역삼 래미안',
    exclusiveArea: 84.9,
    totalFloors: 20,
    ownership: [],
    mortgages: [
      {
        priority: 1,
        type: '근저당권',
        creditor: '신한은행',
        maxSecuredAmount: 200000000,  // ₩2억
        estimatedPrincipal: 166666667, // ₩1.67억 (÷ 1.2)
        registrationDate: '2023-03-15',
        status: 'active'
      }
    ],
    liens: [],
    jeonseRights: [],
    hasSeizure: false,
    hasProvisionalSeizure: false,
    hasAuction: false,
    hasSuperficies: false,
    hasEasement: false,
    hasProvisionalRegistration: false,
    hasProvisionalDisposition: false,
    hasAdvanceNotice: false,
    hasUnregisteredLandRights: false,
    totalEstimatedPrincipal: 166666667,
    totalJeonseAmount: 0
  };

  const safeResult = analyzer.analyze(
    1000000000,  // ₩10억 property value
    500000000,   // ₩5억 proposed jeonse
    safeDeunggibu,
    {
      valueLow: 950000000,
      valueMid: 1000000000,
      valueHigh: 1050000000,
      confidence: 0.85,
      marketTrend: 'stable'
    },
    5 // 5 years old
  );

  console.log(`Safety Score: ${safeResult.overallScore}/100`);
  console.log(`Risk Level: ${safeResult.riskLevel}`);
  console.log(`LTV Ratio: ${(safeResult.ltvRatio * 100).toFixed(1)}%`);
  console.log(`Verdict: ${safeResult.verdict}`);
  console.log(`\nRisks Found: ${safeResult.risks.length}`);
  safeResult.risks.forEach((risk, i) => {
    console.log(`  ${i + 1}. [${risk.severity}] ${risk.title}`);
  });
  console.log(`\n소액보증금 Eligible: ${safeResult.smallAmountPriority.isEligible ? 'YES' : 'NO'}`);
  if (!safeResult.smallAmountPriority.isEligible) {
    console.log(`  (Threshold: ₩${(safeResult.smallAmountPriority.threshold / 100000000).toFixed(1)}억)`);
  }

  // Test Scenario 2: High Risk
  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 TEST 2: HIGH RISK Property (High LTV, multiple creditors)\n');

  const riskyDeunggibu: DeunggibuData = {
    address: '서울특별시 마포구 서교동 123-45',
    buildingName: '마포 푸르지오',
    exclusiveArea: 84.9,
    totalFloors: 20,
    ownership: [],
    mortgages: [
      {
        priority: 1,
        type: '근저당권',
        creditor: '국민은행',
        maxSecuredAmount: 600000000,  // ₩6억
        estimatedPrincipal: 500000000, // ₩5억
        registrationDate: '2022-01-10',
        status: 'active'
      },
      {
        priority: 2,
        type: '근저당권',
        creditor: '우리은행',
        maxSecuredAmount: 240000000,  // ₩2.4억
        estimatedPrincipal: 200000000, // ₩2억
        registrationDate: '2023-06-20',
        status: 'active'
      }
    ],
    liens: [],
    jeonseRights: [
      {
        priority: 1,
        rightHolder: '이전 세입자',
        deposit: 150000000, // ₩1.5억
        registrationDate: '2023-08-01',
        status: 'active'
      }
    ],
    hasSeizure: false,
    hasProvisionalSeizure: true,  // 가압류 있음!
    hasAuction: false,
    hasSuperficies: false,
    hasEasement: false,
    hasProvisionalRegistration: false,
    hasProvisionalDisposition: false,
    hasAdvanceNotice: false,
    hasUnregisteredLandRights: false,
    totalEstimatedPrincipal: 700000000,
    totalJeonseAmount: 150000000
  };

  const riskyResult = analyzer.analyze(
    1000000000,  // ₩10억 property value
    400000000,   // ₩4억 proposed jeonse
    riskyDeunggibu,
    {
      valueLow: 900000000,
      valueMid: 1000000000,
      valueHigh: 1100000000,
      confidence: 0.65,
      marketTrend: 'falling'
    },
    15 // 15 years old
  );

  console.log(`Safety Score: ${riskyResult.overallScore}/100`);
  console.log(`Risk Level: ${riskyResult.riskLevel}`);
  console.log(`LTV Ratio: ${(riskyResult.ltvRatio * 100).toFixed(1)}%`);
  console.log(`Verdict: ${riskyResult.verdict}`);
  console.log(`\nRisks Found: ${riskyResult.risks.length}`);
  riskyResult.risks.slice(0, 5).forEach((risk, i) => {
    console.log(`  ${i + 1}. [${risk.severity}] ${risk.title}`);
  });
  console.log(`\n소액보증금 Eligible: ${riskyResult.smallAmountPriority.isEligible ? 'YES' : 'NO'}`);

  console.log('\n📊 Breakdown:');
  console.log(`  Total Property Value: ₩${(riskyResult.breakdown.totalPropertyValue / 100000000).toFixed(1)}억`);
  console.log(`  Existing Debt: ₩${(riskyResult.breakdown.totalDebt / 100000000).toFixed(1)}억`);
  console.log(`  Your Jeonse: ₩${(riskyResult.breakdown.proposedJeonse / 100000000).toFixed(1)}억`);
  console.log(`  Total Exposure: ₩${(riskyResult.breakdown.totalExposure / 100000000).toFixed(1)}억`);
  console.log(`  Available Equity: ₩${(riskyResult.breakdown.availableEquity / 100000000).toFixed(1)}억`);

  console.log('\n📝 Debt Ranking:');
  riskyResult.breakdown.debtRanking.forEach((debt) => {
    console.log(`  ${debt.rank}. ${debt.type} - ${debt.creditor}: ₩${(debt.amount / 100000000).toFixed(1)}억 (${debt.priority})`);
  });

  console.log('\n⚠️  Mandatory Actions:');
  riskyResult.recommendations.mandatory.slice(0, 4).forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });

  // Test Scenario 3: CRITICAL (Seizure)
  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 TEST 3: CRITICAL Property (Has 압류 - Seizure)\n');

  const criticalDeunggibu: DeunggibuData = {
    ...riskyDeunggibu,
    hasSeizure: true,  // 압류!
    hasAuction: true   // 경매!
  };

  const criticalResult = analyzer.analyze(
    1000000000,
    500000000,
    criticalDeunggibu,
    {
      valueLow: 900000000,
      valueMid: 1000000000,
      valueHigh: 1100000000,
      confidence: 0.5,
      marketTrend: 'falling'
    },
    20
  );

  console.log(`Safety Score: ${criticalResult.overallScore}/100`);
  console.log(`Risk Level: ${criticalResult.riskLevel}`);
  console.log(`Verdict: ${criticalResult.verdict}`);
  console.log(`\nCritical Risks:`);
  criticalResult.risks.filter(r => r.severity === 'CRITICAL').forEach((risk) => {
    console.log(`  ⛔ ${risk.title}: ${risk.description}`);
  });
  console.log(`\n⚠️  Recommendation: ${criticalResult.recommendations.mandatory[0]}`);

  // Test Scenario 4: Small Amount Priority
  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 TEST 4: 소액보증금 Priority Test\n');

  const smallAmountResult = analyzer.checkSmallAmountPriority(
    150000000,  // ₩1.5억 jeonse
    '서울특별시 강남구 역삼동 123-45'
  );

  console.log(`Jeonse Amount: ₩${(150000000 / 100000000).toFixed(1)}억`);
  console.log(`Region: ${smallAmountResult.region}`);
  console.log(`Threshold: ₩${(smallAmountResult.threshold / 100000000).toFixed(1)}억`);
  console.log(`Eligible: ${smallAmountResult.isEligible ? 'YES ✅' : 'NO ❌'}`);
  if (smallAmountResult.isEligible) {
    console.log(`Protected Amount: ₩${(smallAmountResult.protectedAmount / 10000).toFixed(0)}만원`);
  }
  console.log(`\nExplanation: ${smallAmountResult.explanation}`);

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ All Risk Analyzer Tests Complete!\n');
  console.log('Results Summary:');
  console.log(`  Test 1 (Safe): ${safeResult.overallScore}/100 - ${safeResult.riskLevel}`);
  console.log(`  Test 2 (Risky): ${riskyResult.overallScore}/100 - ${riskyResult.riskLevel}`);
  console.log(`  Test 3 (Critical): ${criticalResult.overallScore}/100 - ${criticalResult.riskLevel}`);
  console.log(`  Test 4 (소액보증금): ${smallAmountResult.isEligible ? 'Eligible' : 'Not Eligible'}`);
  console.log('\n' + '═'.repeat(70) + '\n');
}

testRiskAnalyzer();
