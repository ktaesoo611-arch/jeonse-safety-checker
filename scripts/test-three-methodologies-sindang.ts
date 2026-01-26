/**
 * Test: Compare 3 Methodologies for 신당동 (more data, varied ages)
 *
 * 1. CURRENT: Triple-weight (recency × age × area) on total amounts
 * 2. MULTIPLE REGRESSION: Recency-weighted unit prices + market-derived age adjustment
 * 3. TIERED DEPRECIATION: Recency-weighted unit prices + fixed tiered depreciation table
 *
 * Run with: npx tsx scripts/test-three-methodologies-sindang.ts
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

interface MethodResult {
  name: string;
  baseValue: number;
  adjustedValue: number;
  effectiveSampleSize: number;
  transactionsUsed: number;
  depreciation: string;
  details?: any[];
}

// ═══════════════════════════════════════════════════════════════════
// TARGET PROPERTY CONFIGURATION - 신당동
// ═══════════════════════════════════════════════════════════════════
const TARGET = {
  city: '서울특별시',
  district: '중구',
  dong: '신당동',
  address: '620',
  unit: '201호',
  floor: 2,
  exclusiveArea: 61.78,
  buildingYear: 2000,  // 26 years old - good for testing depreciation differences
};

const LAWD_CD = '11140'; // 중구

// Config
const RECENCY_HALFLIFE = 60;
const AREA_FILTER_PERCENT = 15;
const AREA_TOLERANCE_STRICT = 2;

// ═══════════════════════════════════════════════════════════════════
// TIERED DEPRECIATION TABLE
// ═══════════════════════════════════════════════════════════════════
const TIERED_DEPRECIATION = [
  { maxAge: 5,  factor: 1.00,  rate: '0%' },
  { maxAge: 10, factor: 0.93,  rate: '~1.4%/yr' },
  { maxAge: 15, factor: 0.87,  rate: '~1.2%/yr' },
  { maxAge: 20, factor: 0.82,  rate: '~1.0%/yr' },
  { maxAge: 25, factor: 0.78,  rate: '~0.8%/yr' },
  { maxAge: 30, factor: 0.74,  rate: '~0.8%/yr' },
  { maxAge: Infinity, factor: 0.70, rate: '~0.5%/yr' },
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

    return {
      date: `${item.dealYear}-${String(item.dealMonth).padStart(2, '0')}-${String(item.dealDay).padStart(2, '0')}`,
      amount,
      area,
      floor: parseInt(item.floor || '1'),
      buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined,
      buildingName: item.aptNm?.trim() || '',
      legalDong: item.umdNm?.trim() || '',
      unitPrice: area > 0 ? amount / area : 0,
      daysAgo
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// MULTIPLE REGRESSION CALIBRATION
// ═══════════════════════════════════════════════════════════════════
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

  let Saa = 0, Sdd = 0, Spp = 0;
  let Sad = 0, Sap = 0, Sdp = 0;

  for (const d of dataPoints) {
    const da = d.age - meanAge;
    const dd = d.daysAgo - meanDays;
    const dp = d.unitPrice - meanPrice;

    Saa += da * da;
    Sdd += dd * dd;
    Spp += dp * dp;
    Sad += da * dd;
    Sap += da * dp;
    Sdp += dd * dp;
  }

  const correlation = Sad / Math.sqrt(Saa * Sdd);
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
  const rSquared = 1 - (ssRes / ssTot);

  const annualDepreciation = Math.abs(ageCoefficient) / intercept;
  const annualTrend = (-trendCoefficient * 365) / intercept;

  return {
    intercept, ageCoefficient, trendCoefficient,
    annualDepreciation, annualTrend, rSquared,
    sampleSize: n, correlation
  };
}

// ═══════════════════════════════════════════════════════════════════
// METHOD 1: CURRENT TRIPLE-WEIGHT
// ═══════════════════════════════════════════════════════════════════
function calculateTripleWeight(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number
): MethodResult {
  const AGE_HALFLIFE = 10;
  const AREA_HALFLIFE_PERCENT = 0.20;
  const areaHalfLife = targetArea * AREA_HALFLIFE_PERCENT;

  const filtered = transactions.filter(t =>
    Math.abs(t.area - targetArea) <= AREA_TOLERANCE_STRICT
  );

  const weighted = filtered.map(t => {
    const recencyWeight = Math.exp(-t.daysAgo / RECENCY_HALFLIFE);

    let ageWeight = 0.5;
    let yearDiff = 0;
    if (targetBuildingYear && t.buildingYear) {
      yearDiff = t.buildingYear - targetBuildingYear;
      ageWeight = Math.exp(-Math.abs(yearDiff) / AGE_HALFLIFE);
    }

    const areaDiff = Math.abs(t.area - targetArea);
    const areaWeight = Math.exp(-areaDiff / areaHalfLife);

    const combinedWeight = recencyWeight * ageWeight * areaWeight;

    return {
      ...t,
      yearDiff,
      recencyWeight,
      ageWeight,
      areaWeight,
      combinedWeight,
      weightedAmount: t.amount * combinedWeight
    };
  });

  const totalWeightedAmount = weighted.reduce((sum, t) => sum + t.weightedAmount, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.combinedWeight, 0);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.combinedWeight, 2), 0);

  const baseValue = totalWeight > 0 ? totalWeightedAmount / totalWeight : 0;
  const effectiveSampleSize = sumSqWeights > 0 ? Math.pow(totalWeight, 2) / sumSqWeights : 0;

  return {
    name: 'Triple-Weight (Current)',
    baseValue,
    adjustedValue: 0,
    effectiveSampleSize,
    transactionsUsed: filtered.length,
    depreciation: 'Similarity weight (10yr half-life)',
    details: weighted.sort((a, b) => b.combinedWeight - a.combinedWeight)
  };
}

// ═══════════════════════════════════════════════════════════════════
// METHOD 2: MULTIPLE REGRESSION
// ═══════════════════════════════════════════════════════════════════
function calculateMultipleRegression(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number,
  calibration: CalibrationResult
): MethodResult {
  const currentYear = new Date().getFullYear();
  const targetAge = currentYear - targetBuildingYear;

  const areaTolerance = targetArea * (AREA_FILTER_PERCENT / 100);
  const filtered = transactions.filter(t =>
    Math.abs(t.area - targetArea) <= areaTolerance && t.unitPrice > 0
  );

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

    return {
      ...t,
      yearDiff,
      recencyWeight,
      ageAdjustment,
      adjustedUnitPrice,
      weightedUnitPrice: adjustedUnitPrice * recencyWeight
    };
  });

  const totalWeightedUnitPrice = weighted.reduce((sum, t) => sum + t.weightedUnitPrice, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.recencyWeight, 0);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.recencyWeight, 2), 0);

  const avgUnitPrice = totalWeight > 0 ? totalWeightedUnitPrice / totalWeight : 0;
  const baseValue = avgUnitPrice * targetArea;
  const effectiveSampleSize = sumSqWeights > 0 ? Math.pow(totalWeight, 2) / sumSqWeights : 0;

  return {
    name: 'Multiple Regression',
    baseValue,
    adjustedValue: 0,
    effectiveSampleSize,
    transactionsUsed: filtered.length,
    depreciation: `${(calibration.annualDepreciation * 100).toFixed(2)}%/yr (market-derived)`,
    details: weighted.sort((a, b) => b.recencyWeight - a.recencyWeight)
  };
}

// ═══════════════════════════════════════════════════════════════════
// METHOD 3: TIERED DEPRECIATION TABLE
// ═══════════════════════════════════════════════════════════════════
function calculateTieredDepreciation(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number
): MethodResult {
  const currentYear = new Date().getFullYear();
  const targetAge = currentYear - targetBuildingYear;

  const areaTolerance = targetArea * (AREA_FILTER_PERCENT / 100);
  const filtered = transactions.filter(t =>
    Math.abs(t.area - targetArea) <= areaTolerance && t.unitPrice > 0
  );

  const weighted = filtered.map(t => {
    const recencyWeight = Math.exp(-t.daysAgo / RECENCY_HALFLIFE);

    let ageAdjustment = 1.0;
    let yearDiff = 0;
    if (targetBuildingYear && t.buildingYear) {
      const comparableAge = currentYear - t.buildingYear;
      yearDiff = targetBuildingYear - t.buildingYear;
      ageAdjustment = getTieredAgeAdjustment(targetAge, comparableAge);
      ageAdjustment = Math.max(0.7, Math.min(1.3, ageAdjustment));
    }

    const adjustedUnitPrice = t.unitPrice * ageAdjustment;

    return {
      ...t,
      yearDiff,
      recencyWeight,
      ageAdjustment,
      adjustedUnitPrice,
      weightedUnitPrice: adjustedUnitPrice * recencyWeight
    };
  });

  const totalWeightedUnitPrice = weighted.reduce((sum, t) => sum + t.weightedUnitPrice, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.recencyWeight, 0);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.recencyWeight, 2), 0);

  const avgUnitPrice = totalWeight > 0 ? totalWeightedUnitPrice / totalWeight : 0;
  const baseValue = avgUnitPrice * targetArea;
  const effectiveSampleSize = sumSqWeights > 0 ? Math.pow(totalWeight, 2) / sumSqWeights : 0;

  return {
    name: 'Tiered Depreciation',
    baseValue,
    adjustedValue: 0,
    effectiveSampleSize,
    transactionsUsed: filtered.length,
    depreciation: 'Fixed table (1.4%→0.5%/yr by age)',
    details: weighted.sort((a, b) => b.recencyWeight - a.recencyWeight)
  };
}

function applyFloorAdjustment(baseValue: number, floor: number, maxFloor: number): number {
  if (floor === 1) return baseValue * 0.88;
  if (floor === 2) return baseValue * 0.95;
  if (floor === maxFloor) return baseValue * 0.97;
  const relativePosition = floor / maxFloor;
  if (relativePosition >= 0.5 && relativePosition <= 0.8) return baseValue * 1.05;
  return baseValue;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not set');
    process.exit(1);
  }

  const currentYear = new Date().getFullYear();
  const targetAge = currentYear - TARGET.buildingYear;

  console.log('\n' + '═'.repeat(95));
  console.log('  THREE METHODOLOGY COMPARISON: 신당동 620 201호');
  console.log('═'.repeat(95));
  console.log(`\n  Target: ${TARGET.dong} ${TARGET.address} ${TARGET.unit}`);
  console.log(`  Specs: ${TARGET.exclusiveArea}㎡ | Built ${TARGET.buildingYear} (${targetAge}yr old) | Floor ${TARGET.floor}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Fetch 신당동 transactions
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(95));
  console.log('  STEP 1: Fetching transactions');
  console.log('─'.repeat(95));

  const allTransactions: Transaction[] = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const yearMonth = `${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      const monthData = await fetchMultifamilyTransactions(apiKey, LAWD_CD, yearMonth);
      const sindangOnly = monthData.filter(t => t.legalDong === '신당동');
      allTransactions.push(...sindangOnly);
    } catch (error) {
      // Skip
    }
  }

  console.log(`  신당동: ${allTransactions.length} transactions`);

  // Building year distribution in transactions
  const yearDist = new Map<number, number>();
  allTransactions.forEach(t => {
    if (t.buildingYear) {
      yearDist.set(t.buildingYear, (yearDist.get(t.buildingYear) || 0) + 1);
    }
  });
  const sortedYears = [...yearDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log('\n  Building year distribution (top 5):');
  sortedYears.forEach(([year, count]) => {
    const age = currentYear - year;
    console.log(`    ${year} (${age}yr): ${count} transactions`);
  });

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Multiple Regression Calibration
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(95));
  console.log('  STEP 2: Market Calibration (Multiple Regression)');
  console.log('─'.repeat(95));

  const calibration = calibrateWithMultipleRegression(allTransactions);

  console.log('\n  ┌─────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log(`  │  Sample: ${calibration.sampleSize} | R²: ${(calibration.rSquared * 100).toFixed(1)}% | Correlation: ${calibration.correlation.toFixed(3)} ${Math.abs(calibration.correlation) > 0.7 ? '⚠️' : '✓'}`);
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Intercept: ${(calibration.intercept / 10000).toFixed(0)}만/㎡ | Age β₁: ${(calibration.ageCoefficient / 10000).toFixed(2)}만/㎡/yr | Trend β₂: ${(calibration.trendCoefficient / 10000).toFixed(4)}만/㎡/day`);
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  → Annual Depreciation: ${(calibration.annualDepreciation * 100).toFixed(2)}% | Market Trend: ${calibration.annualTrend >= 0 ? '+' : ''}${(calibration.annualTrend * 100).toFixed(2)}%/yr`);
  console.log('  └─────────────────────────────────────────────────────────────────────────────────────────┘');

  // ─────────────────────────────────────────────────────────────────
  // STEP 3: Tiered Depreciation Info
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(95));
  console.log('  STEP 3: Tiered Depreciation Table');
  console.log('─'.repeat(95));

  const targetTierFactor = getTieredAgeFactor(targetAge);
  console.log(`\n  Target (${targetAge}yr): Factor = ${targetTierFactor.toFixed(2)} (${((1-targetTierFactor)*100).toFixed(0)}% depreciation)`);
  console.log('\n  Example adjustments for comparables:');

  [5, 10, 15, 20, 25, 30].forEach(compAge => {
    const adj = getTieredAgeAdjustment(targetAge, compAge);
    console.log(`    ${compAge}yr comparable → adjustment: ×${adj.toFixed(3)} (target ${adj > 1 ? 'newer' : 'older'})`);
  });

  // ─────────────────────────────────────────────────────────────────
  // STEP 4: Calculate all three methods
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(95));
  console.log('  STEP 4: Calculate Est.Value');
  console.log('─'.repeat(95));

  const results: MethodResult[] = [];

  const tripleWeight = calculateTripleWeight(allTransactions, TARGET.exclusiveArea, TARGET.buildingYear);
  results.push(tripleWeight);

  const multipleRegression = calculateMultipleRegression(
    allTransactions, TARGET.exclusiveArea, TARGET.buildingYear, calibration
  );
  results.push(multipleRegression);

  const tieredDepr = calculateTieredDepreciation(allTransactions, TARGET.exclusiveArea, TARGET.buildingYear);
  results.push(tieredDepr);

  const maxFloor = Math.max(...allTransactions.map(t => t.floor), TARGET.floor);
  results.forEach(r => {
    r.adjustedValue = applyFloorAdjustment(r.baseValue, TARGET.floor, maxFloor);
  });

  // ─────────────────────────────────────────────────────────────────
  // STEP 5: Show detailed comparison
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(95));
  console.log('  COMPARISON RESULTS');
  console.log('═'.repeat(95));

  console.log('\n  ┌───────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Method                │ Est.Value │ Eff.Sample │ Txns │ Depreciation                    │');
  console.log('  ├───────────────────────────────────────────────────────────────────────────────────────────┤');

  results.forEach(r => {
    const valueStr = `${(r.adjustedValue / 100000000).toFixed(2)}억`;
    const effStr = r.effectiveSampleSize.toFixed(1);
    console.log(
      `  │  ${r.name.padEnd(20)} │ ${valueStr.padStart(9)} │ ${effStr.padStart(10)} │ ${String(r.transactionsUsed).padStart(4)} │ ${r.depreciation.padEnd(31)} │`
    );
  });

  console.log('  └───────────────────────────────────────────────────────────────────────────────────────────┘');

  // Show differences
  const baselineValue = results[0].adjustedValue;
  console.log('\n  Difference from Current (Triple-Weight):');
  results.slice(1).forEach(r => {
    const diff = r.adjustedValue - baselineValue;
    const diffPct = (diff / baselineValue * 100);
    console.log(`    ${r.name}: ${diff >= 0 ? '+' : ''}${(diff / 100000000).toFixed(2)}억 (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)`);
  });

  // ─────────────────────────────────────────────────────────────────
  // STEP 6: Detailed transaction breakdown
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(95));
  console.log('  TRANSACTION DETAILS (Top 5 by influence)');
  console.log('─'.repeat(95));

  // Triple-Weight details
  console.log('\n  [Triple-Weight] - Weight = Recency × Age × Area');
  console.log('  Date       │ Amount │ Built │ Age Diff │ RecWt │ AgeWt │ AreaWt │ Combined');
  console.log('  ' + '─'.repeat(85));
  tripleWeight.details?.slice(0, 5).forEach((t: any) => {
    console.log(
      `  ${t.date} │ ${(t.amount/100000000).toFixed(2)}억 │ ${t.buildingYear || '????'} │ ${t.yearDiff >= 0 ? '+' : ''}${t.yearDiff || 0}yr    │ ${t.recencyWeight.toFixed(3)} │ ${t.ageWeight.toFixed(3)} │ ${t.areaWeight.toFixed(3)}  │ ${t.combinedWeight.toFixed(4)}`
    );
  });

  // Multiple Regression details
  console.log('\n  [Multiple Regression] - Adjustment = 1 + (yearDiff × 0.96%)');
  console.log('  Date       │ UnitPrice │ Built │ YrDiff │ Age Adj │ Adj.UP │ RecWt');
  console.log('  ' + '─'.repeat(75));
  multipleRegression.details?.slice(0, 5).forEach((t: any) => {
    console.log(
      `  ${t.date} │ ${(t.unitPrice/10000).toFixed(0)}만/㎡ │ ${t.buildingYear || '????'} │ ${t.yearDiff >= 0 ? '+' : ''}${t.yearDiff || 0}yr  │ ×${t.ageAdjustment.toFixed(3)} │ ${(t.adjustedUnitPrice/10000).toFixed(0)}만/㎡ │ ${t.recencyWeight.toFixed(3)}`
    );
  });

  // Tiered details
  console.log('\n  [Tiered Depreciation] - Adjustment = TargetFactor / ComparableFactor');
  console.log('  Date       │ UnitPrice │ Built │ YrDiff │ Age Adj │ Adj.UP │ RecWt');
  console.log('  ' + '─'.repeat(75));
  tieredDepr.details?.slice(0, 5).forEach((t: any) => {
    console.log(
      `  ${t.date} │ ${(t.unitPrice/10000).toFixed(0)}만/㎡ │ ${t.buildingYear || '????'} │ ${t.yearDiff >= 0 ? '+' : ''}${t.yearDiff || 0}yr  │ ×${t.ageAdjustment.toFixed(3)} │ ${(t.adjustedUnitPrice/10000).toFixed(0)}만/㎡ │ ${t.recencyWeight.toFixed(3)}`
    );
  });

  // ─────────────────────────────────────────────────────────────────
  // STEP 7: Analysis
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(95));
  console.log('  ANALYSIS');
  console.log('═'.repeat(95));

  console.log('\n  Depreciation Rate Comparison:');
  console.log(`    • Multiple Regression (market-derived): ${(calibration.annualDepreciation * 100).toFixed(2)}%/yr`);
  console.log(`    • Tiered Table (for ${targetAge}yr building): ~${((1 - targetTierFactor) / targetAge * 100).toFixed(2)}%/yr cumulative avg`);

  const regVsTiered = results[2].adjustedValue - results[1].adjustedValue;
  const regVsTieredPct = (regVsTiered / results[1].adjustedValue * 100);

  console.log(`\n  Tiered vs Regression difference: ${regVsTiered >= 0 ? '+' : ''}${(regVsTiered / 100000000).toFixed(2)}억 (${regVsTieredPct >= 0 ? '+' : ''}${regVsTieredPct.toFixed(1)}%)`);

  if (Math.abs(regVsTieredPct) > 5) {
    console.log('\n  ⚠️  Significant difference between methods.');
    if (regVsTieredPct > 0) {
      console.log('     Tiered table may be too aggressive in depreciation for this market.');
    } else {
      console.log('     Tiered table may be too conservative for this market.');
    }
  }

  console.log(`\n  Market Trend Impact:`);
  console.log(`    • Detected trend: ${calibration.annualTrend >= 0 ? '+' : ''}${(calibration.annualTrend * 100).toFixed(2)}%/yr`);
  console.log(`    • Multiple Regression explicitly separates this from depreciation`);
  console.log(`    • Tiered Depreciation relies only on recency weight for trend`);

  console.log('\n' + '═'.repeat(95));
  console.log('  TEST COMPLETE');
  console.log('═'.repeat(95) + '\n');
}

main().catch(console.error);
