/**
 * End-to-End Analysis Test
 *
 * Tests the complete flow from PDF parsing → risk analysis → report generation
 * Validates calculation accuracy and data consistency
 */

import { DeunggibuParser } from '../lib/analyzers/deunggibu-parser';
import { RiskAnalyzer } from '../lib/analyzers/risk-analyzer';
import * as fs from 'fs';
import * as path from 'path';

console.log('🧪 END-TO-END ANALYSIS TEST\n');
console.log('═'.repeat(80) + '\n');

// Step 1: Parse real PDF data
console.log('📄 STEP 1: Parsing 등기부등본...\n');

const sampleText = fs.readFileSync(
  path.join(__dirname, '../test/sample-deunggibu.txt'),
  'utf-8'
);

const parser = new DeunggibuParser();
const deunggibuData = parser.parse(sampleText);

console.log(`✅ Parsed successfully`);
console.log(`   - Mortgages found: ${deunggibuData.mortgages.length}`);
console.log(`   - Total 채권최고액: ₩${(deunggibuData.totalMortgageAmount / 100000000).toFixed(1)}억`);
console.log(`   - Estimated principal: ₩${(deunggibuData.totalEstimatedPrincipal / 100000000).toFixed(1)}억`);
console.log(`   - Liens: ${deunggibuData.liens.length}`);
console.log(`   - Jeonse rights: ${deunggibuData.jeonseRights.length}\n`);

// Verify mortgage details
console.log('🔍 Mortgage Breakdown:\n');
deunggibuData.mortgages.forEach((m, i) => {
  console.log(`   ${i + 1}. #${m.priority} - ${m.seniority?.toUpperCase()}`);
  console.log(`      Creditor: ${m.creditor}`);
  console.log(`      채권최고액: ₩${(m.maxSecuredAmount / 100000000).toFixed(1)}억`);
  console.log(`      Est. Principal: ₩${(m.estimatedPrincipal / 100000000).toFixed(1)}억`);
  console.log(`      Date: ${m.registrationDate}\n`);
});

// Step 2: Mock property valuation
console.log('\n' + '═'.repeat(80) + '\n');
console.log('💰 STEP 2: Property Valuation...\n');

const propertyValue = 1200000000; // ₩12억
const proposedJeonse = 500000000;  // ₩5억

console.log(`   Property Value: ₩${(propertyValue / 100000000).toFixed(1)}억`);
console.log(`   Proposed Jeonse: ₩${(proposedJeonse / 100000000).toFixed(1)}억\n`);

const valuation = {
  valueLow: propertyValue * 0.95,
  valueMid: propertyValue,
  valueHigh: propertyValue * 1.05,
  confidence: 0.75,
  marketTrend: 'stable' as const
};

// Step 3: Run risk analysis
console.log('═'.repeat(80) + '\n');
console.log('⚠️  STEP 3: Risk Analysis...\n');

const analyzer = new RiskAnalyzer();
const riskResult = analyzer.analyze(
  propertyValue,
  proposedJeonse,
  deunggibuData,
  valuation,
  15 // 15 years old building
);

console.log(`✅ Analysis complete\n`);
console.log(`   Overall Score: ${riskResult.overallScore}/100`);
console.log(`   Risk Level: ${riskResult.riskLevel}`);
console.log(`   Verdict: ${riskResult.verdict}\n`);

// Step 4: Validate calculations
console.log('═'.repeat(80) + '\n');
console.log('🧮 STEP 4: Calculation Validation...\n');

// LTV calculation verification
const expectedTotalDebt = deunggibuData.totalEstimatedPrincipal;
const expectedTotalExposure = expectedTotalDebt + proposedJeonse;
const expectedLTV = (expectedTotalExposure / propertyValue) * 100;
const expectedEquity = propertyValue - expectedTotalExposure;

console.log('Expected vs Actual:\n');

const checks = [
  {
    name: 'Total Debt (Principal)',
    expected: expectedTotalDebt,
    actual: riskResult.totalDebt,
    format: (v: number) => `₩${(v / 100000000).toFixed(2)}억`
  },
  {
    name: 'LTV Ratio',
    expected: expectedLTV,
    actual: riskResult.ltv,
    format: (v: number) => `${v.toFixed(2)}%`
  },
  {
    name: 'Available Equity',
    expected: expectedEquity,
    actual: riskResult.availableEquity,
    format: (v: number) => `₩${(v / 100000000).toFixed(2)}억`
  },
  {
    name: 'Debt Ranking Count',
    expected: deunggibuData.mortgages.length + 1, // +1 for proposed jeonse
    actual: riskResult.debtRanking.length,
    format: (v: number) => `${v} entries`
  }
];

let allPassed = true;

checks.forEach(check => {
  const match = Math.abs(check.expected - check.actual) < 0.01;
  const status = match ? '✅' : '❌';

  console.log(`   ${status} ${check.name}:`);
  console.log(`      Expected: ${check.format(check.expected)}`);
  console.log(`      Actual:   ${check.format(check.actual)}`);

  if (!match) {
    console.log(`      ⚠️  MISMATCH!`);
    allPassed = false;
  }
  console.log('');
});

// Step 5: Validate mortgage seniority
console.log('═'.repeat(80) + '\n');
console.log('🏅 STEP 5: Mortgage Seniority Validation...\n');

const debtRanking = riskResult.debtRanking;
let seniorityCorrect = true;

console.log('Debt Priority Ranking:\n');
debtRanking.forEach((debt, index) => {
  console.log(`   ${debt.rank}. ${debt.priority.toUpperCase()}`);
  console.log(`      ${debt.type}`);
  console.log(`      ${debt.creditor}`);
  console.log(`      ₩${(debt.amount / 100000000).toFixed(1)}억`);
  console.log(`      ${debt.registrationDate}\n`);

  // Validate ranking is sequential
  if (debt.rank !== index + 1) {
    console.log(`      ❌ Rank mismatch! Expected ${index + 1}, got ${debt.rank}\n`);
    seniorityCorrect = false;
  }
});

// Verify first mortgage is senior, last is your jeonse
if (debtRanking.length > 0) {
  const firstDebt = debtRanking[0];
  const lastDebt = debtRanking[debtRanking.length - 1];

  if (firstDebt.priority !== 'senior') {
    console.log(`❌ First mortgage should be 'senior', got '${firstDebt.priority}'\n`);
    seniorityCorrect = false;
  }

  if (lastDebt.creditor !== 'You') {
    console.log(`❌ Last entry should be 'You', got '${lastDebt.creditor}'\n`);
    seniorityCorrect = false;
  }

  if (lastDebt.amount !== proposedJeonse) {
    console.log(`❌ Your jeonse amount mismatch: expected ₩${(proposedJeonse / 100000000).toFixed(1)}억, got ₩${(lastDebt.amount / 100000000).toFixed(1)}억\n`);
    seniorityCorrect = false;
  }
}

// Step 6: Component scores validation
console.log('═'.repeat(80) + '\n');
console.log('📊 STEP 6: Component Scores Validation...\n');

const scores = {
  'LTV Score': riskResult.ltvScore,
  'Debt Score': riskResult.debtScore,
  'Legal Score': riskResult.legalScore,
  'Market Score': riskResult.marketScore,
  'Building Score': riskResult.buildingScore
};

let scoresValid = true;

Object.entries(scores).forEach(([name, score]) => {
  const valid = score >= 0 && score <= 100;
  const status = valid ? '✅' : '❌';
  console.log(`   ${status} ${name}: ${score}/100`);

  if (!valid) {
    console.log(`      ⚠️  Score out of range!`);
    scoresValid = false;
  }
});

console.log('');

// Verify overall score calculation
const expectedOverallScore = Math.round(
  riskResult.ltvScore * 0.30 +
  riskResult.debtScore * 0.25 +
  riskResult.legalScore * 0.25 +
  riskResult.marketScore * 0.10 +
  riskResult.buildingScore * 0.10
);

if (riskResult.overallScore === expectedOverallScore) {
  console.log(`   ✅ Overall score calculation correct: ${riskResult.overallScore}/100\n`);
} else {
  console.log(`   ❌ Overall score mismatch:`);
  console.log(`      Expected: ${expectedOverallScore}/100`);
  console.log(`      Actual: ${riskResult.overallScore}/100\n`);
  scoresValid = false;
}

// Step 7: Risk detection validation
console.log('═'.repeat(80) + '\n');
console.log('🚨 STEP 7: Risk Detection...\n');

console.log(`   Risks detected: ${riskResult.risks.length}\n`);

riskResult.risks.forEach((risk, index) => {
  console.log(`   ${index + 1}. [${risk.severity}] ${risk.title}`);
  console.log(`      ${risk.description}`);
  console.log(`      Impact: ${risk.impact} points\n`);
});

// Step 8: Recommendations validation
console.log('═'.repeat(80) + '\n');
console.log('💡 STEP 8: Recommendations...\n');

console.log(`   Mandatory: ${riskResult.recommendations.mandatory.length}`);
riskResult.recommendations.mandatory.forEach((rec, i) => {
  console.log(`      ${i + 1}. ${rec}`);
});

console.log(`\n   Recommended: ${riskResult.recommendations.recommended.length}`);
riskResult.recommendations.recommended.forEach((rec, i) => {
  console.log(`      ${i + 1}. ${rec}`);
});

console.log(`\n   Optional: ${riskResult.recommendations.optional.length}`);
riskResult.recommendations.optional.forEach((rec, i) => {
  console.log(`      ${i + 1}. ${rec}`);
});

// Final summary
console.log('\n' + '═'.repeat(80) + '\n');
console.log('📋 TEST SUMMARY\n');

const testResults = [
  { name: 'Parsing', passed: deunggibuData.mortgages.length === 8 },
  { name: 'Calculations', passed: allPassed },
  { name: 'Seniority Ranking', passed: seniorityCorrect },
  { name: 'Component Scores', passed: scoresValid },
  { name: 'Risk Detection', passed: riskResult.risks.length > 0 },
  { name: 'Recommendations', passed: riskResult.recommendations.mandatory.length > 0 }
];

testResults.forEach(test => {
  const status = test.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`   ${status}: ${test.name}`);
});

const overallPass = testResults.every(t => t.passed);

console.log('\n' + '═'.repeat(80) + '\n');

if (overallPass) {
  console.log('🎉 ALL TESTS PASSED! Analysis engine is accurate and consistent.\n');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED! Please review calculations above.\n');
  process.exit(1);
}
