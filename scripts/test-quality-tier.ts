/**
 * Test: Quality Tier Stratification for 행당동 293-8
 *
 * Hypothesis: Dong-level aggregation fails due to unobserved heterogeneity.
 * Solution: Stratify by unit price tiers (proxy for building quality).
 *
 * Run with: npx tsx scripts/test-quality-tier.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import axios from 'axios';

interface Transaction {
  date: string;
  amount: number;
  area: number;
  floor: number;
  buildingYear?: number;
  buildingName?: string;
  legalDong: string;
  unitPrice: number;
  daysAgo: number;
  qualityTier?: 'budget' | 'standard' | 'mid' | 'premium';
}

interface CalibrationResult {
  intercept: number;
  ageCoefficient: number;
  trendCoefficient: number;
  annualDepreciation: number;
  annualTrend: number;
  rSquared: number;
  sampleSize: number;
  correlation: number;
}

// ═══════════════════════════════════════════════════════════════════
// TARGET PROPERTY: 행당동 293-8
// ═══════════════════════════════════════════════════════════════════
const TARGET = {
  dong: '행당동',
  address: '293-8',
  floor: 2,
  exclusiveArea: 29.57,
  buildingYear: 2018,
  // Actual data for validation
  actualTransaction: 44900,  // 만원 (Jun 2025)
  actualListPrice: 44000,    // 만원 (today)
};

const LAWD_CD = '11200'; // 성동구

const RECENCY_HALFLIFE = 60;
const AREA_FILTER_PERCENT = 30;

// ═══════════════════════════════════════════════════════════════════
// QUALITY TIER DEFINITIONS (Unit Price based)
// ═══════════════════════════════════════════════════════════════════
const QUALITY_TIERS = {
  budget:   { min: 0,    max: 1200, label: 'Budget (<1,200만/㎡)' },
  standard: { min: 1200, max: 1500, label: 'Standard (1,200-1,500만/㎡)' },
  mid:      { min: 1500, max: 1900, label: 'Mid (1,500-1,900만/㎡)' },
  premium:  { min: 1900, max: Infinity, label: 'Premium (>1,900만/㎡)' },
};

type QualityTier = keyof typeof QUALITY_TIERS;

function classifyQualityTier(unitPrice: number): QualityTier {
  const priceIn만 = unitPrice / 10000;  // Convert to 만원/㎡
  if (priceIn만 < 1200) return 'budget';
  if (priceIn만 < 1500) return 'standard';
  if (priceIn만 < 1900) return 'mid';
  return 'premium';
}

// Tiered Depreciation
const TIERED_DEPRECIATION = [
  { maxAge: 5,  factor: 1.00 },
  { maxAge: 10, factor: 0.93 },
  { maxAge: 15, factor: 0.87 },
  { maxAge: 20, factor: 0.82 },
  { maxAge: 25, factor: 0.78 },
  { maxAge: 30, factor: 0.74 },
  { maxAge: Infinity, factor: 0.70 },
];

function getTieredAgeFactor(age: number): number {
  for (const tier of TIERED_DEPRECIATION) {
    if (age <= tier.maxAge) return tier.factor;
  }
  return 0.70;
}

function getTieredAgeAdjustment(targetAge: number, comparableAge: number): number {
  return getTieredAgeFactor(targetAge) / getTieredAgeFactor(comparableAge);
}

async function fetchMultifamilyTransactions(
  apiKey: string,
  lawdCd: string,
  yearMonth: string
): Promise<Transaction[]> {
  const response = await axios.get(
    'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade',
    {
      params: {
        serviceKey: apiKey,
        pageNo: 1,
        numOfRows: 1000,
        LAWD_CD: lawdCd,
        DEAL_YMD: yearMonth
      },
      timeout: 30000
    }
  );

  const items = response.data.response?.body?.items?.item || [];
  const transactions = Array.isArray(items) ? items : [items];
  const now = new Date();

  return transactions.map((item: any) => {
    const amount = parseInt(String(item.dealAmount).replace(/,/g, '')) * 10000;
    const area = parseFloat(item.excluUseAr || '0');
    const txnDate = new Date(
      parseInt(item.dealYear),
      parseInt(item.dealMonth) - 1,
      parseInt(item.dealDay)
    );
    const daysAgo = Math.floor((now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
    const unitPrice = area > 0 ? amount / area : 0;

    return {
      date: `${item.dealYear}-${String(item.dealMonth).padStart(2, '0')}-${String(item.dealDay).padStart(2, '0')}`,
      amount,
      area,
      floor: parseInt(item.floor || '1'),
      buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined,
      buildingName: item.aptNm?.trim() || '',
      legalDong: item.umdNm?.trim() || '',
      unitPrice,
      daysAgo,
      qualityTier: classifyQualityTier(unitPrice)
    };
  });
}

function calibrateWithMultipleRegression(transactions: Transaction[]): CalibrationResult {
  const currentYear = new Date().getFullYear();

  const dataPoints = transactions
    .filter(t => t.buildingYear && t.area > 0 && t.unitPrice > 0)
    .map(t => ({
      unitPrice: t.unitPrice,
      age: currentYear - t.buildingYear!,
      daysAgo: t.daysAgo
    }));

  const n = dataPoints.length;

  if (n < 10) {
    return {
      intercept: 0, ageCoefficient: 0, trendCoefficient: 0,
      annualDepreciation: 0.015, annualTrend: 0, rSquared: 0,
      sampleSize: n, correlation: 0
    };
  }

  let sumAge = 0, sumDays = 0, sumPrice = 0;
  for (const d of dataPoints) {
    sumAge += d.age;
    sumDays += d.daysAgo;
    sumPrice += d.unitPrice;
  }
  const meanAge = sumAge / n;
  const meanDays = sumDays / n;
  const meanPrice = sumPrice / n;

  let Saa = 0, Sdd = 0, Sad = 0, Sap = 0, Sdp = 0;
  for (const d of dataPoints) {
    const da = d.age - meanAge;
    const dd = d.daysAgo - meanDays;
    const dp = d.unitPrice - meanPrice;
    Saa += da * da;
    Sdd += dd * dd;
    Sad += da * dd;
    Sap += da * dp;
    Sdp += dd * dp;
  }

  const correlation = Saa * Sdd > 0 ? Sad / Math.sqrt(Saa * Sdd) : 0;
  const det = Saa * Sdd - Sad * Sad;

  if (Math.abs(det) < 1e-10) {
    return {
      intercept: meanPrice, ageCoefficient: 0, trendCoefficient: 0,
      annualDepreciation: 0.015, annualTrend: 0, rSquared: 0,
      sampleSize: n, correlation
    };
  }

  const ageCoefficient = (Sdd * Sap - Sad * Sdp) / det;
  const trendCoefficient = (Saa * Sdp - Sad * Sap) / det;
  const intercept = meanPrice - ageCoefficient * meanAge - trendCoefficient * meanDays;

  let ssRes = 0, ssTot = 0;
  for (const d of dataPoints) {
    const predicted = intercept + ageCoefficient * d.age + trendCoefficient * d.daysAgo;
    ssRes += Math.pow(d.unitPrice - predicted, 2);
    ssTot += Math.pow(d.unitPrice - meanPrice, 2);
  }
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  const annualDepreciation = intercept > 0 ? Math.abs(ageCoefficient) / intercept : 0.015;
  const annualTrend = intercept > 0 ? (-trendCoefficient * 365) / intercept : 0;

  return {
    intercept, ageCoefficient, trendCoefficient,
    annualDepreciation, annualTrend, rSquared,
    sampleSize: n, correlation
  };
}

function calculateMultipleRegression(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number,
  calibration: CalibrationResult,
  tierFilter?: QualityTier
): { value: number; effectiveSampleSize: number; transactionsUsed: number; details: any[] } {
  const currentYear = new Date().getFullYear();
  const areaTolerance = targetArea * (AREA_FILTER_PERCENT / 100);

  let filtered = transactions.filter(t =>
    Math.abs(t.area - targetArea) <= areaTolerance && t.unitPrice > 0
  );

  // Apply quality tier filter if specified
  if (tierFilter) {
    filtered = filtered.filter(t => t.qualityTier === tierFilter);
  }

  const weighted = filtered.map(t => {
    const recencyWeight = Math.exp(-t.daysAgo / RECENCY_HALFLIFE);
    let ageAdjustment = 1.0;
    let yearDiff = 0;
    if (targetBuildingYear && t.buildingYear) {
      yearDiff = targetBuildingYear - t.buildingYear;
      ageAdjustment = 1 + (yearDiff * calibration.annualDepreciation);
      ageAdjustment = Math.max(0.7, Math.min(1.3, ageAdjustment));
    }
    const adjustedUnitPrice = t.unitPrice * ageAdjustment;
    return { ...t, yearDiff, recencyWeight, ageAdjustment, adjustedUnitPrice, weightedUnitPrice: adjustedUnitPrice * recencyWeight };
  });

  const totalWeightedUP = weighted.reduce((sum, t) => sum + t.weightedUnitPrice, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.recencyWeight, 0);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.recencyWeight, 2), 0);

  const avgUnitPrice = totalWeight > 0 ? totalWeightedUP / totalWeight : 0;
  const baseValue = avgUnitPrice * targetArea;
  const effectiveSampleSize = sumSqWeights > 0 ? Math.pow(totalWeight, 2) / sumSqWeights : 0;

  // Apply floor adjustment
  const floorAdjustedValue = TARGET.floor === 1 ? baseValue * 0.88
    : TARGET.floor === 2 ? baseValue * 0.95
    : baseValue;

  return {
    value: floorAdjustedValue,
    effectiveSampleSize,
    transactionsUsed: filtered.length,
    details: weighted.sort((a, b) => b.recencyWeight - a.recencyWeight)
  };
}

function applyFloorAdjustment(baseValue: number, floor: number): number {
  if (floor === 1) return baseValue * 0.88;
  if (floor === 2) return baseValue * 0.95;
  return baseValue;
}

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) { console.error('MOLIT_API_KEY not set'); process.exit(1); }

  const currentYear = new Date().getFullYear();
  const targetAge = currentYear - TARGET.buildingYear;

  // Calculate target's quality tier based on actual transaction
  const targetUnitPrice = (TARGET.actualTransaction * 10000) / TARGET.exclusiveArea;
  const targetTier = classifyQualityTier(targetUnitPrice);

  console.log('\n' + '═'.repeat(95));
  console.log('  QUALITY TIER STRATIFICATION TEST: 행당동 293-8');
  console.log('═'.repeat(95));
  console.log(`\n  Target: ${TARGET.dong} ${TARGET.address}`);
  console.log(`  Specs: ${TARGET.exclusiveArea}㎡ | Built ${TARGET.buildingYear} (${targetAge}yr old) | Floor ${TARGET.floor}`);
  console.log(`\n  Actual Transaction (Jun 2025): ${TARGET.actualTransaction.toLocaleString()}만원`);
  console.log(`  Actual List Price (today): ${TARGET.actualListPrice.toLocaleString()}만원`);
  console.log(`  Actual Unit Price: ${(targetUnitPrice / 10000).toFixed(0)}만/㎡ → Tier: ${QUALITY_TIERS[targetTier].label}`);

  // Fetch transactions
  console.log('\n' + '─'.repeat(95));
  console.log('  STEP 1: Fetching transactions');
  console.log('─'.repeat(95));

  const dongTransactions: Transaction[] = [];
  const allDistrictTransactions: Transaction[] = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const yearMonth = `${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      const monthData = await fetchMultifamilyTransactions(apiKey, LAWD_CD, yearMonth);
      allDistrictTransactions.push(...monthData);
      const dongOnly = monthData.filter(t => t.legalDong === TARGET.dong);
      dongTransactions.push(...dongOnly);
    } catch (error) {}
  }

  console.log(`  ${TARGET.dong}: ${dongTransactions.length} transactions`);
  console.log(`  성동구 전체: ${allDistrictTransactions.length} transactions`);

  // Analyze tier distribution
  console.log('\n' + '─'.repeat(95));
  console.log('  STEP 2: Quality Tier Distribution (행당동)');
  console.log('─'.repeat(95));

  const areaTolerance = TARGET.exclusiveArea * (AREA_FILTER_PERCENT / 100);
  const nearbyTxns = dongTransactions.filter(t =>
    Math.abs(t.area - TARGET.exclusiveArea) <= areaTolerance
  );

  const tierCounts: Record<QualityTier, number> = { budget: 0, standard: 0, mid: 0, premium: 0 };
  nearbyTxns.forEach(t => {
    if (t.qualityTier) tierCounts[t.qualityTier]++;
  });

  console.log(`\n  Transactions near ${TARGET.exclusiveArea}㎡ (±${AREA_FILTER_PERCENT}%):`);
  console.log('  ┌────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Tier              │ Count │ Unit Price Range      │ Description                     │');
  console.log('  ├────────────────────────────────────────────────────────────────────────────────────────┤');
  (Object.keys(QUALITY_TIERS) as QualityTier[]).forEach(tier => {
    const marker = tier === targetTier ? ' ← TARGET' : '';
    console.log(`  │  ${QUALITY_TIERS[tier].label.padEnd(18)} │ ${String(tierCounts[tier]).padStart(5)} │ ${tier === 'premium' ? '>1,900만/㎡' : tier === 'budget' ? '<1,200만/㎡' : `${QUALITY_TIERS[tier].min}-${QUALITY_TIERS[tier].max}만/㎡`}${marker.padStart(20)} │`);
  });
  console.log('  └────────────────────────────────────────────────────────────────────────────────────────┘');

  // Show transactions by tier
  console.log('\n  Transactions by tier:');
  nearbyTxns.sort((a, b) => b.daysAgo - a.daysAgo).forEach(t => {
    const tierLabel = t.qualityTier?.toUpperCase().padEnd(8) || 'UNKNOWN ';
    const marker = t.qualityTier === targetTier ? '✓' : ' ';
    console.log(`  ${marker} [${tierLabel}] ${t.date} │ ${t.area.toFixed(1)}㎡ │ ${t.buildingYear || '????'} │ ${(t.amount/10000).toLocaleString().padStart(6)}만 │ ${(t.unitPrice/10000/10000).toFixed(0)}만/㎡`);
  });

  // Calibration
  console.log('\n' + '─'.repeat(95));
  console.log('  STEP 3: Market Calibration');
  console.log('─'.repeat(95));

  // Calibrate on same tier from district level
  const sameTierDistrict = allDistrictTransactions.filter(t => t.qualityTier === targetTier);
  const calibrationAll = calibrateWithMultipleRegression(allDistrictTransactions);
  const calibrationTier = calibrateWithMultipleRegression(sameTierDistrict);

  console.log('\n  District-wide calibration:');
  console.log(`    Sample: ${calibrationAll.sampleSize} | Depreciation: ${(calibrationAll.annualDepreciation * 100).toFixed(2)}%/yr | Trend: ${calibrationAll.annualTrend >= 0 ? '+' : ''}${(calibrationAll.annualTrend * 100).toFixed(2)}%/yr`);

  console.log(`\n  Same-tier (${targetTier}) calibration:`);
  console.log(`    Sample: ${calibrationTier.sampleSize} | Depreciation: ${(calibrationTier.annualDepreciation * 100).toFixed(2)}%/yr | Trend: ${calibrationTier.annualTrend >= 0 ? '+' : ''}${(calibrationTier.annualTrend * 100).toFixed(2)}%/yr`);

  // Calculate with different approaches
  console.log('\n' + '─'.repeat(95));
  console.log('  STEP 4: Calculate Est.Value with Different Approaches');
  console.log('─'.repeat(95));

  const results = [
    {
      name: 'All Tiers (Current)',
      ...calculateMultipleRegression(dongTransactions, TARGET.exclusiveArea, TARGET.buildingYear, calibrationAll)
    },
    {
      name: `Same Tier Only (${targetTier})`,
      ...calculateMultipleRegression(dongTransactions, TARGET.exclusiveArea, TARGET.buildingYear, calibrationTier, targetTier)
    },
    {
      name: `Adjacent Tiers (${targetTier}±1)`,
      ...calculateMultipleRegression(
        dongTransactions.filter(t => {
          const tiers: QualityTier[] = ['budget', 'standard', 'mid', 'premium'];
          const targetIdx = tiers.indexOf(targetTier);
          const txnIdx = t.qualityTier ? tiers.indexOf(t.qualityTier) : -1;
          return Math.abs(targetIdx - txnIdx) <= 1;
        }),
        TARGET.exclusiveArea, TARGET.buildingYear, calibrationTier
      )
    },
  ];

  // Results
  console.log('\n' + '═'.repeat(95));
  console.log('  COMPARISON RESULTS');
  console.log('═'.repeat(95));

  const actualValue = TARGET.actualTransaction;

  console.log('\n  ┌─────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Approach                    │ Est.Value │ Eff.Sample │ Txns │ Error vs Actual        │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');

  results.forEach(r => {
    const valueIn만 = r.value / 10000;
    const error = ((valueIn만 - actualValue) / actualValue * 100);
    const errorStr = `${error >= 0 ? '+' : ''}${error.toFixed(1)}%`;
    console.log(
      `  │  ${r.name.padEnd(26)} │ ${(valueIn만/10000).toFixed(2)}억 │ ${r.effectiveSampleSize.toFixed(1).padStart(10)} │ ${String(r.transactionsUsed).padStart(4)} │ ${errorStr.padStart(10)} (${(valueIn만 - actualValue).toFixed(0)}만) │`
    );
  });

  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Actual Transaction (Jun 25) │ ${(actualValue/10000).toFixed(2)}억 │        n/a │  n/a │        0.0%            │`);
  console.log(`  │  Actual List Price (today)   │ ${(TARGET.actualListPrice/10000).toFixed(2)}억 │        n/a │  n/a │        n/a             │`);
  console.log('  └─────────────────────────────────────────────────────────────────────────────────────────┘');

  // Show contributing transactions for best method
  const bestMethod = results.reduce((best, r) => {
    const bestError = Math.abs((best.value / 10000 - actualValue) / actualValue);
    const rError = Math.abs((r.value / 10000 - actualValue) / actualValue);
    return rError < bestError ? r : best;
  });

  console.log(`\n  Best approach: "${bestMethod.name}"`);
  console.log('\n  Contributing transactions:');
  console.log('  Date       │ Amount │ Area   │ Built │ UnitPrice │ AgeAdj │ Weight │ Tier');
  console.log('  ' + '─'.repeat(85));
  bestMethod.details.slice(0, 8).forEach((t: any) => {
    console.log(
      `  ${t.date} │ ${(t.amount/10000).toLocaleString().padStart(6)}만 │ ${t.area.toFixed(1)}㎡ │ ${t.buildingYear || '????'} │ ${(t.unitPrice/10000/10000).toFixed(0)}만/㎡ │ ×${t.ageAdjustment.toFixed(3)} │ ${t.recencyWeight.toFixed(3)} │ ${t.qualityTier}`
    );
  });

  console.log('\n' + '═'.repeat(95));
  console.log('  CONCLUSION');
  console.log('═'.repeat(95));

  const allTiersError = Math.abs((results[0].value / 10000 - actualValue) / actualValue * 100);
  const sameTierError = Math.abs((results[1].value / 10000 - actualValue) / actualValue * 100);
  const improvement = allTiersError - sameTierError;

  console.log(`\n  Quality tier stratification ${improvement > 0 ? 'IMPROVED' : 'DID NOT IMPROVE'} accuracy:`);
  console.log(`    • All Tiers error: ${allTiersError.toFixed(1)}%`);
  console.log(`    • Same Tier error: ${sameTierError.toFixed(1)}%`);
  console.log(`    • Improvement: ${improvement.toFixed(1)} percentage points`);

  console.log('\n' + '═'.repeat(95) + '\n');
}

main().catch(console.error);
