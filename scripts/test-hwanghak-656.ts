/**
 * Test: Compare 3 Methodologies for 황학동 656, 28.52㎡
 *
 * Run with: npx tsx scripts/test-hwanghak-656.ts
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
// TARGET PROPERTY: 황학동 656, 28.52㎡
// ═══════════════════════════════════════════════════════════════════
const TARGET = {
  dong: '행당동',
  address: '293-8',
  floor: 2,
  exclusiveArea: 29.57,
  buildingYear: 2018,  // Actual building year
};

const LAWD_CD = '11200'; // 성동구

const RECENCY_HALFLIFE = 60;
const AREA_FILTER_PERCENT = 30;  // Wider for sparse data
const AREA_TOLERANCE_STRICT = 5;

// Tiered Depreciation Table
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
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  const annualDepreciation = intercept > 0 ? Math.abs(ageCoefficient) / intercept : 0.015;
  const annualTrend = intercept > 0 ? (-trendCoefficient * 365) / intercept : 0;

  return {
    intercept, ageCoefficient, trendCoefficient,
    annualDepreciation, annualTrend, rSquared,
    sampleSize: n, correlation
  };
}

function calculateTripleWeight(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number
): MethodResult {
  const AGE_HALFLIFE = 10;
  const areaHalfLife = targetArea * 0.20;

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

    return { ...t, yearDiff, recencyWeight, ageWeight, areaWeight, combinedWeight, weightedAmount: t.amount * combinedWeight };
  });

  const totalWeightedAmount = weighted.reduce((sum, t) => sum + t.weightedAmount, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.combinedWeight, 0);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.combinedWeight, 2), 0);

  return {
    name: 'Triple-Weight',
    baseValue: totalWeight > 0 ? totalWeightedAmount / totalWeight : 0,
    adjustedValue: 0,
    effectiveSampleSize: sumSqWeights > 0 ? Math.pow(totalWeight, 2) / sumSqWeights : 0,
    transactionsUsed: filtered.length,
    depreciation: 'Similarity weight',
    details: weighted.sort((a, b) => b.combinedWeight - a.combinedWeight)
  };
}

function calculateMultipleRegression(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number,
  calibration: CalibrationResult
): MethodResult {
  const currentYear = new Date().getFullYear();
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
    return { ...t, yearDiff, recencyWeight, ageAdjustment, adjustedUnitPrice, weightedUnitPrice: adjustedUnitPrice * recencyWeight };
  });

  const totalWeightedUP = weighted.reduce((sum, t) => sum + t.weightedUnitPrice, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.recencyWeight, 0);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.recencyWeight, 2), 0);

  const avgUnitPrice = totalWeight > 0 ? totalWeightedUP / totalWeight : 0;

  return {
    name: 'Multiple Regression',
    baseValue: avgUnitPrice * targetArea,
    adjustedValue: 0,
    effectiveSampleSize: sumSqWeights > 0 ? Math.pow(totalWeight, 2) / sumSqWeights : 0,
    transactionsUsed: filtered.length,
    depreciation: `${(calibration.annualDepreciation * 100).toFixed(2)}%/yr`,
    details: weighted.sort((a, b) => b.recencyWeight - a.recencyWeight)
  };
}

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
    return { ...t, yearDiff, recencyWeight, ageAdjustment, adjustedUnitPrice, weightedUnitPrice: adjustedUnitPrice * recencyWeight };
  });

  const totalWeightedUP = weighted.reduce((sum, t) => sum + t.weightedUnitPrice, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.recencyWeight, 0);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.recencyWeight, 2), 0);

  const avgUnitPrice = totalWeight > 0 ? totalWeightedUP / totalWeight : 0;

  return {
    name: 'Tiered Depreciation',
    baseValue: avgUnitPrice * targetArea,
    adjustedValue: 0,
    effectiveSampleSize: sumSqWeights > 0 ? Math.pow(totalWeight, 2) / sumSqWeights : 0,
    transactionsUsed: filtered.length,
    depreciation: 'Fixed table',
    details: weighted.sort((a, b) => b.recencyWeight - a.recencyWeight)
  };
}

function applyFloorAdjustment(baseValue: number, floor: number, maxFloor: number): number {
  if (floor === 1) return baseValue * 0.88;
  if (floor === 2) return baseValue * 0.95;
  if (floor === maxFloor) return baseValue * 0.97;
  return baseValue;
}

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) { console.error('MOLIT_API_KEY not set'); process.exit(1); }

  const currentYear = new Date().getFullYear();

  console.log('\n' + '═'.repeat(90));
  console.log(`  THREE METHODOLOGY COMPARISON: ${TARGET.dong} ${TARGET.address}`);
  console.log('═'.repeat(90));
  console.log(`\n  Target: ${TARGET.dong} ${TARGET.address}`);
  console.log(`  Specs: ${TARGET.exclusiveArea}㎡ | Floor ${TARGET.floor}`);

  // Fetch 황학동 transactions
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 1: Fetching 황학동 transactions');
  console.log('─'.repeat(90));

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
  console.log(`  성동구 전체 (for calibration): ${allDistrictTransactions.length} transactions`);

  // Show 황학동 transactions around target area
  const nearbyTxns = dongTransactions.filter(t =>
    Math.abs(t.area - TARGET.exclusiveArea) <= TARGET.exclusiveArea * 0.3
  );
  console.log(`\n  ${TARGET.dong} transactions near ${TARGET.exclusiveArea}㎡ (±30%):`);
  nearbyTxns.slice(0, 10).forEach(t => {
    console.log(`    ${t.date} | ${t.area.toFixed(1)}㎡ | ${t.buildingYear || '????'} | ${(t.amount/10000).toLocaleString()}만원`);
  });

  // Auto-detect building year if not specified
  let targetBuildingYear = TARGET.buildingYear;
  if (!targetBuildingYear || targetBuildingYear === 0) {
    // Find most common building year for similar-sized units
    const yearCounts = new Map<number, number>();
    nearbyTxns.forEach(t => {
      if (t.buildingYear) {
        yearCounts.set(t.buildingYear, (yearCounts.get(t.buildingYear) || 0) + 1);
      }
    });
    const sortedYears = [...yearCounts.entries()].sort((a, b) => b[1] - a[1]);
    if (sortedYears.length > 0) {
      targetBuildingYear = sortedYears[0][0];
      console.log(`\n  Auto-detected building year: ${targetBuildingYear} (most common in nearby transactions)`);
    } else {
      targetBuildingYear = 2015; // fallback
      console.log(`\n  Using fallback building year: ${targetBuildingYear}`);
    }
  }

  // Calibration using district-level data
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 2: Market Calibration (중구 전체 data)');
  console.log('─'.repeat(90));

  const calibration = calibrateWithMultipleRegression(allDistrictTransactions);

  console.log(`\n  Sample: ${calibration.sampleSize} | R²: ${(calibration.rSquared * 100).toFixed(1)}%`);
  console.log(`  Annual Depreciation: ${(calibration.annualDepreciation * 100).toFixed(2)}%`);
  console.log(`  Market Trend: ${calibration.annualTrend >= 0 ? '+' : ''}${(calibration.annualTrend * 100).toFixed(2)}%/yr`);

  // Calculate all methods
  const finalTargetAge = currentYear - targetBuildingYear;
  console.log('\n' + '─'.repeat(90));
  console.log('  STEP 3: Calculate Est.Value');
  console.log('─'.repeat(90));
  console.log(`\n  Using: ${TARGET.exclusiveArea}㎡ | Built ${targetBuildingYear} (${finalTargetAge}yr old) | Floor ${TARGET.floor}`);

  const results: MethodResult[] = [];

  // Use dong-level for valuation
  const tripleWeight = calculateTripleWeight(dongTransactions, TARGET.exclusiveArea, targetBuildingYear);
  results.push(tripleWeight);

  const multipleRegression = calculateMultipleRegression(dongTransactions, TARGET.exclusiveArea, targetBuildingYear, calibration);
  results.push(multipleRegression);

  const tieredDepr = calculateTieredDepreciation(dongTransactions, TARGET.exclusiveArea, targetBuildingYear);
  results.push(tieredDepr);

  // Floor adjustment
  const maxFloor = Math.max(...dongTransactions.map(t => t.floor), TARGET.floor);
  results.forEach(r => {
    r.adjustedValue = applyFloorAdjustment(r.baseValue, TARGET.floor, maxFloor);
  });

  // Results
  console.log('\n' + '═'.repeat(90));
  console.log('  RESULTS');
  console.log('═'.repeat(90));

  console.log('\n  ┌────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Method                │ Est.Value │ Eff.Sample │ Txns │ Depreciation            │');
  console.log('  ├────────────────────────────────────────────────────────────────────────────────────┤');

  results.forEach(r => {
    const valueStr = r.adjustedValue > 0 ? `${(r.adjustedValue / 100000000).toFixed(2)}억` : 'N/A';
    console.log(
      `  │  ${r.name.padEnd(20)} │ ${valueStr.padStart(9)} │ ${r.effectiveSampleSize.toFixed(1).padStart(10)} │ ${String(r.transactionsUsed).padStart(4)} │ ${r.depreciation.padEnd(23)} │`
    );
  });

  console.log('  └────────────────────────────────────────────────────────────────────────────────────┘');

  // Show transaction details if available
  if (results[1].details && results[1].details.length > 0) {
    console.log('\n  Contributing transactions (Multiple Regression method):');
    console.log('  Date       │ Amount │ Area   │ Built │ UnitPrice │ AgeAdj │ Weight');
    console.log('  ' + '─'.repeat(70));
    results[1].details.slice(0, 5).forEach((t: any) => {
      console.log(
        `  ${t.date} │ ${(t.amount/10000).toLocaleString().padStart(6)}만 │ ${t.area.toFixed(1)}㎡ │ ${t.buildingYear || '????'} │ ${(t.unitPrice/10000).toFixed(0)}만/㎡ │ ×${t.ageAdjustment.toFixed(3)} │ ${t.recencyWeight.toFixed(3)}`
      );
    });
  }

  if (results.every(r => r.adjustedValue === 0)) {
    console.log('\n  ⚠️  No matching transactions found in 황학동 for this area range.');
    console.log('     Consider expanding to 중구 전체 or nearby 동 for valuation.');
  }

  console.log('\n' + '═'.repeat(90) + '\n');
}

main().catch(console.error);
