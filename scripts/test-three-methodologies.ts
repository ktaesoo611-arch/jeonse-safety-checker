/**
 * Test: Compare 3 Methodologies for 황학동 656
 *
 * 1. CURRENT: Triple-weight (recency × age × area) on total amounts
 * 2. MULTIPLE REGRESSION: Recency-weighted unit prices + market-derived age adjustment
 * 3. TIERED DEPRECIATION: Recency-weighted unit prices + fixed tiered depreciation table
 *
 * Run with: npx tsx scripts/test-three-methodologies.ts
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
}

// ═══════════════════════════════════════════════════════════════════
// TARGET PROPERTY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
const TARGET = {
  city: '서울특별시',
  district: '중구',
  dong: '황학동',
  address: '656',
  floor: 2,                    // Assumed
  exclusiveArea: 0,            // Will be determined from actual data
  buildingYear: 0,             // Will be determined from actual data
};

const LAWD_CD = '11140'; // 중구

// Config
const RECENCY_HALFLIFE = 60;
const AREA_FILTER_PERCENT = 30;  // Wider for sparse data
const AREA_TOLERANCE_STRICT = 5; // Wider for sparse data

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
      intercept: 0,
      ageCoefficient: 0,
      trendCoefficient: 0,
      annualDepreciation: 0.015,
      annualTrend: 0,
      rSquared: 0,
      sampleSize: n,
      correlation: 0
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
      intercept: meanPrice,
      ageCoefficient: 0,
      trendCoefficient: 0,
      annualDepreciation: 0.015,
      annualTrend: 0,
      rSquared: 0,
      sampleSize: n,
      correlation
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
    intercept,
    ageCoefficient,
    trendCoefficient,
    annualDepreciation,
    annualTrend,
    rSquared,
    sampleSize: n,
    correlation
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
    if (targetBuildingYear && t.buildingYear) {
      const yearDiff = Math.abs(t.buildingYear - targetBuildingYear);
      ageWeight = Math.exp(-yearDiff / AGE_HALFLIFE);
    }

    const areaDiff = Math.abs(t.area - targetArea);
    const areaWeight = Math.exp(-areaDiff / areaHalfLife);

    const combinedWeight = recencyWeight * ageWeight * areaWeight;

    return {
      ...t,
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
    adjustedValue: 0, // Will be set after floor adjustment
    effectiveSampleSize,
    transactionsUsed: filtered.length,
    depreciation: 'Similarity weight (10yr half-life)'
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
    if (targetBuildingYear && t.buildingYear) {
      const yearDiff = targetBuildingYear - t.buildingYear;
      ageAdjustment = 1 + (yearDiff * calibration.annualDepreciation);
      ageAdjustment = Math.max(0.7, Math.min(1.3, ageAdjustment));
    }

    const adjustedUnitPrice = t.unitPrice * ageAdjustment;

    return {
      ...t,
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
    depreciation: `${(calibration.annualDepreciation * 100).toFixed(2)}%/yr (market-derived)`
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
    if (targetBuildingYear && t.buildingYear) {
      const comparableAge = currentYear - t.buildingYear;
      ageAdjustment = getTieredAgeAdjustment(targetAge, comparableAge);
      ageAdjustment = Math.max(0.7, Math.min(1.3, ageAdjustment));
    }

    const adjustedUnitPrice = t.unitPrice * ageAdjustment;

    return {
      ...t,
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
    depreciation: 'Fixed table (1.4%→0.5%/yr by age)'
  };
}

function applyFloorAdjustment(baseValue: number, floor: number, maxFloor: number): number {
  if (floor === 1) return baseValue * 0.88;
  if (floor === 2) return baseValue * 0.95;
  if (floor === maxFloor) return baseValue * 0.97;

  const relativePosition = floor / maxFloor;
  if (relativePosition >= 0.5 && relativePosition <= 0.8) {
    return baseValue * 1.05;
  }
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

  console.log('\n' + '═'.repeat(90));
  console.log('  THREE METHODOLOGY COMPARISON TEST: 황학동 656');
  console.log('═'.repeat(90));

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Fetch 황학동 transactions
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 1: Fetching 황학동 transactions (12 months)');
  console.log('─'.repeat(90));

  const allTransactions: Transaction[] = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const yearMonth = `${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      const monthData = await fetchMultifamilyTransactions(apiKey, LAWD_CD, yearMonth);
      const dongOnly = monthData.filter(t => t.legalDong === '황학동');
      allTransactions.push(...dongOnly);
      if (dongOnly.length > 0) {
        console.log(`  ${yearMonth}: ${dongOnly.length} transactions`);
      }
    } catch (error) {
      console.error(`  ${yearMonth}: Error fetching`);
    }
  }

  console.log(`\n  Total 황학동 transactions: ${allTransactions.length}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Analyze transactions to determine target property specs
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 2: Analyzing 황학동 transactions');
  console.log('─'.repeat(90));

  // Find common areas and building years
  const areaDistribution = new Map<number, number>();
  const yearDistribution = new Map<number, number>();

  allTransactions.forEach(t => {
    const roundedArea = Math.round(t.area);
    areaDistribution.set(roundedArea, (areaDistribution.get(roundedArea) || 0) + 1);
    if (t.buildingYear) {
      yearDistribution.set(t.buildingYear, (yearDistribution.get(t.buildingYear) || 0) + 1);
    }
  });

  const sortedAreas = [...areaDistribution.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedYears = [...yearDistribution.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  console.log('\n  Top 5 areas (㎡):');
  sortedAreas.forEach(([area, count]) => console.log(`    ${area}㎡: ${count} transactions`));

  console.log('\n  Top 5 building years:');
  sortedYears.forEach(([year, count]) => console.log(`    ${year}: ${count} transactions`));

  // Use most common area and building year from actual 황학동 data
  const targetArea = TARGET.exclusiveArea || sortedAreas[0]?.[0] || 29;
  const targetBuildingYear = TARGET.buildingYear || sortedYears[0]?.[0] || 2015;
  const currentYear = new Date().getFullYear();
  const targetAge = currentYear - targetBuildingYear;

  console.log(`\n  Using target specs:`);
  console.log(`    Area: ${targetArea}㎡`);
  console.log(`    Built: ${targetBuildingYear} (${targetAge} years old)`);
  console.log(`    Floor: ${TARGET.floor}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 2.5: Fetch ALL 중구 transactions for calibration (district-level)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 2.5: Fetching ALL 중구 transactions for calibration');
  console.log('─'.repeat(90));

  const allDistrictTransactions: Transaction[] = [];

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const yearMonth = `${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      const monthData = await fetchMultifamilyTransactions(apiKey, LAWD_CD, yearMonth);
      allDistrictTransactions.push(...monthData);
    } catch (error) {
      // Skip errors
    }
  }

  console.log(`  Total 중구 transactions: ${allDistrictTransactions.length}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 3: Multiple Regression Calibration (using district-level data)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 3: Market Calibration (Multiple Regression on 중구 data)');
  console.log('─'.repeat(90));

  const calibration = calibrateWithMultipleRegression(allDistrictTransactions);

  console.log('\n  Regression Results:');
  console.log('  ┌────────────────────────────────────────────────────────────────────────────────────┐');
  console.log(`  │  Sample Size: ${calibration.sampleSize} transactions`);
  console.log(`  │  R² (model fit): ${(calibration.rSquared * 100).toFixed(1)}%`);
  console.log(`  │  Age↔DaysAgo Correlation: ${calibration.correlation.toFixed(3)} ${Math.abs(calibration.correlation) > 0.7 ? '⚠️ HIGH' : '✓ OK'}`);
  console.log('  ├────────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Intercept (new bldg, today): ${(calibration.intercept / 10000).toFixed(0)}만원/㎡`);
  console.log(`  │  Age Coefficient (β₁): ${(calibration.ageCoefficient / 10000).toFixed(2)}만원/㎡ per year of age`);
  console.log(`  │  Trend Coefficient (β₂): ${(calibration.trendCoefficient / 10000).toFixed(4)}만원/㎡ per day ago`);
  console.log('  ├────────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  → Annual Depreciation Rate: ${(calibration.annualDepreciation * 100).toFixed(2)}%`);
  console.log(`  │  → Annual Market Trend: ${calibration.annualTrend >= 0 ? '+' : ''}${(calibration.annualTrend * 100).toFixed(2)}%`);
  console.log('  └────────────────────────────────────────────────────────────────────────────────────┘');

  // ─────────────────────────────────────────────────────────────────
  // STEP 4: Tiered Depreciation Table Info
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 4: Tiered Depreciation Table');
  console.log('─'.repeat(90));

  console.log('\n  ┌─────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Age Range    │  Factor  │  Cumulative Depreciation  │  Marginal Rate            │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────────┤');
  TIERED_DEPRECIATION.forEach(tier => {
    const maxAgeStr = tier.maxAge === Infinity ? '30+' : `0-${tier.maxAge}`;
    const cumDepr = ((1 - tier.factor) * 100).toFixed(0);
    console.log(`  │  ${maxAgeStr.padEnd(11)} │  ${tier.factor.toFixed(2)}   │  -${cumDepr.padStart(2)}%                        │  ${tier.rate.padEnd(10)}              │`);
  });
  console.log('  └─────────────────────────────────────────────────────────────────────────────────────┘');

  const targetTierFactor = getTieredAgeFactor(targetAge);
  console.log(`\n  Target property (${targetAge} years old): Factor = ${targetTierFactor.toFixed(2)}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 5: Calculate all three methods
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 5: Calculate Est.Value with Three Methods');
  console.log('─'.repeat(90));

  const results: MethodResult[] = [];

  // Method 1: Triple-Weight
  const tripleWeight = calculateTripleWeight(allTransactions, targetArea, targetBuildingYear);
  results.push(tripleWeight);

  // Method 2: Multiple Regression
  const multipleRegression = calculateMultipleRegression(
    allTransactions, targetArea, targetBuildingYear, calibration
  );
  results.push(multipleRegression);

  // Method 3: Tiered Depreciation
  const tieredDepr = calculateTieredDepreciation(allTransactions, targetArea, targetBuildingYear);
  results.push(tieredDepr);

  // Apply floor adjustment to all
  const maxFloor = Math.max(...allTransactions.map(t => t.floor), TARGET.floor);
  results.forEach(r => {
    r.adjustedValue = applyFloorAdjustment(r.baseValue, TARGET.floor, maxFloor);
  });

  // ─────────────────────────────────────────────────────────────────
  // STEP 6: Display Results
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(90));
  console.log('  COMPARISON RESULTS');
  console.log('═'.repeat(90));

  console.log('\n  Target: 황학동 656');
  console.log(`  Specs: ${targetArea}㎡ | Built ${targetBuildingYear} (${targetAge}yr) | Floor ${TARGET.floor}`);

  console.log('\n  ┌──────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Method                │ Est.Value │ Eff.Sample │ Txns │ Depreciation Method       │');
  console.log('  ├──────────────────────────────────────────────────────────────────────────────────────┤');

  results.forEach(r => {
    const valueStr = `${(r.adjustedValue / 100000000).toFixed(2)}억`;
    const effStr = r.effectiveSampleSize.toFixed(1);
    console.log(
      `  │  ${r.name.padEnd(20)} │ ${valueStr.padStart(9)} │ ${effStr.padStart(10)} │ ${String(r.transactionsUsed).padStart(4)} │ ${r.depreciation.padEnd(25)} │`
    );
  });

  console.log('  └──────────────────────────────────────────────────────────────────────────────────────┘');

  // Calculate differences
  const baselineValue = results[0].adjustedValue;
  console.log('\n  Difference from Current (Triple-Weight):');
  results.slice(1).forEach(r => {
    const diff = r.adjustedValue - baselineValue;
    const diffPct = (diff / baselineValue * 100);
    console.log(`    ${r.name}: ${diff >= 0 ? '+' : ''}${(diff / 100000000).toFixed(2)}억 (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)`);
  });

  // Compare regression vs tiered
  const regressionValue = results[1].adjustedValue;
  const tieredValue = results[2].adjustedValue;
  const regVsTieredDiff = tieredValue - regressionValue;
  const regVsTieredPct = (regVsTieredDiff / regressionValue * 100);

  console.log(`\n  Tiered vs Multiple Regression: ${regVsTieredDiff >= 0 ? '+' : ''}${(regVsTieredDiff / 100000000).toFixed(2)}억 (${regVsTieredPct >= 0 ? '+' : ''}${regVsTieredPct.toFixed(1)}%)`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 7: Analysis
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(90));
  console.log('  ANALYSIS');
  console.log('─'.repeat(90));

  console.log('\n  Depreciation Rate Comparison:');
  console.log(`    • Multiple Regression (market-derived): ${(calibration.annualDepreciation * 100).toFixed(2)}%/yr`);
  console.log(`    • Tiered Table (for ${targetAge}yr building): ~${((1 - targetTierFactor) / targetAge * 100).toFixed(2)}%/yr avg`);

  const regDeprRate = calibration.annualDepreciation * 100;
  const tieredAvgRate = ((1 - targetTierFactor) / targetAge * 100);

  if (Math.abs(regDeprRate - tieredAvgRate) > 0.5) {
    console.log(`\n  ⚠️  Significant difference between market-derived and tiered rates.`);
    if (regDeprRate < tieredAvgRate) {
      console.log(`     Market shows slower depreciation than tiered table assumes.`);
      console.log(`     Consider updating tiered table based on market data.`);
    } else {
      console.log(`     Market shows faster depreciation than tiered table assumes.`);
      console.log(`     Tiered table may be too optimistic for this area.`);
    }
  }

  console.log(`\n  Market Trend: ${calibration.annualTrend >= 0 ? '+' : ''}${(calibration.annualTrend * 100).toFixed(2)}%/yr`);
  if (Math.abs(calibration.annualTrend) > 0.10) {
    console.log(`  → Strong market trend detected. Multiple regression accounts for this,`);
    console.log(`    while tiered depreciation does not (relies on recency weight only).`);
  }

  console.log('\n  Data Utilization:');
  console.log(`    • Triple-Weight: ${results[0].effectiveSampleSize.toFixed(1)} effective samples from ${results[0].transactionsUsed} transactions`);
  console.log(`    • Unit Price methods: ${results[1].effectiveSampleSize.toFixed(1)} effective samples from ${results[1].transactionsUsed} transactions`);

  const dataImprovement = ((results[1].effectiveSampleSize / results[0].effectiveSampleSize) - 1) * 100;
  console.log(`    → Unit price approach uses ${dataImprovement.toFixed(0)}% more effective data`);

  console.log('\n' + '═'.repeat(90));
  console.log('  TEST COMPLETE');
  console.log('═'.repeat(90) + '\n');
}

main().catch(console.error);
