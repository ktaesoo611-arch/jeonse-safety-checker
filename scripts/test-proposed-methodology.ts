/**
 * Test: Compare Current vs Proposed Methodology for 신당동 620 201호
 *
 * Current: Triple-weight (recency × age × area) on total amounts
 * Proposed: Recency-weighted unit prices + market-derived age adjustment
 *
 * Key improvement: Multiple regression to separate age depreciation from market trend
 *
 * Run with: npx tsx scripts/test-proposed-methodology.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import axios from 'axios';

interface Transaction {
  date: string;
  amount: number;        // 원
  area: number;          // ㎡
  floor: number;
  buildingYear?: number;
  buildingName?: string;
  legalDong: string;
  unitPrice: number;     // 원/㎡
  daysAgo: number;
}

interface CalibrationResult {
  intercept: number;           // β₀: baseline unit price (new building, today)
  ageCoefficient: number;      // β₁: price change per year of age
  trendCoefficient: number;    // β₂: price change per day ago (market trend)
  annualDepreciation: number;  // derived rate
  annualTrend: number;         // derived market trend (positive = prices rising)
  rSquared: number;            // model fit
  sampleSize: number;
  correlation: number;         // age vs daysAgo correlation (multicollinearity check)
}

// ═══════════════════════════════════════════════════════════════════
// TARGET PROPERTY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
const TARGET = {
  city: '서울특별시',
  district: '중구',
  dong: '신당동',
  address: '620',
  unit: '201호',
  floor: 2,
  exclusiveArea: 61.78,
  buildingYear: 2000,
};

const LAWD_CD = '11140'; // 중구

// Config
const RECENCY_HALFLIFE = 60;  // days
const AREA_FILTER_PERCENT = 15; // ±15% for proposed method (wider net)
const AREA_TOLERANCE_STRICT = 2; // ±2㎡ for current method

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
// MULTIPLE REGRESSION: Separate Age Depreciation from Market Trend
// ═══════════════════════════════════════════════════════════════════
function calibrateWithMultipleRegression(transactions: Transaction[]): CalibrationResult {
  const currentYear = new Date().getFullYear();

  // Filter transactions with known building year
  const dataPoints = transactions
    .filter(t => t.buildingYear && t.area > 0 && t.unitPrice > 0)
    .map(t => ({
      unitPrice: t.unitPrice,
      age: currentYear - t.buildingYear!,
      daysAgo: t.daysAgo
    }));

  const n = dataPoints.length;

  if (n < 10) {
    console.log('  ⚠️  Insufficient data for regression, using fallback');
    return {
      intercept: 0,
      ageCoefficient: 0,
      trendCoefficient: 0,
      annualDepreciation: 0.015, // fallback 1.5%
      annualTrend: 0,
      rSquared: 0,
      sampleSize: n,
      correlation: 0
    };
  }

  // Calculate means
  let sumAge = 0, sumDays = 0, sumPrice = 0;
  for (const d of dataPoints) {
    sumAge += d.age;
    sumDays += d.daysAgo;
    sumPrice += d.unitPrice;
  }
  const meanAge = sumAge / n;
  const meanDays = sumDays / n;
  const meanPrice = sumPrice / n;

  // Calculate sums of squares and cross products
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

  // Check for multicollinearity
  const correlation = Sad / Math.sqrt(Saa * Sdd);

  // Solve normal equations for multiple regression
  // [Saa  Sad] [β₁]   [Sap]
  // [Sad  Sdd] [β₂] = [Sdp]

  const det = Saa * Sdd - Sad * Sad;

  if (Math.abs(det) < 1e-10) {
    console.log('  ⚠️  Singular matrix, using fallback');
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

  const ageCoefficient = (Sdd * Sap - Sad * Sdp) / det;    // β₁
  const trendCoefficient = (Saa * Sdp - Sad * Sap) / det;  // β₂
  const intercept = meanPrice - ageCoefficient * meanAge - trendCoefficient * meanDays;

  // Calculate R²
  let ssRes = 0, ssTot = 0;
  for (const d of dataPoints) {
    const predicted = intercept + ageCoefficient * d.age + trendCoefficient * d.daysAgo;
    ssRes += Math.pow(d.unitPrice - predicted, 2);
    ssTot += Math.pow(d.unitPrice - meanPrice, 2);
  }
  const rSquared = 1 - (ssRes / ssTot);

  // Derive rates (relative to intercept which represents new building today)
  const annualDepreciation = Math.abs(ageCoefficient) / intercept;
  // trendCoefficient is per day ago, negative means prices were lower in the past
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
// METHOD 1: CURRENT TRIPLE-WEIGHT APPROACH
// ═══════════════════════════════════════════════════════════════════
function calculateCurrentMethod(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number
): { baseValue: number; effectiveSampleSize: number } {
  const AGE_HALFLIFE = 10;
  const AREA_HALFLIFE_PERCENT = 0.20;
  const areaHalfLife = targetArea * AREA_HALFLIFE_PERCENT;

  // Filter by strict area tolerance first
  const filtered = transactions.filter(t =>
    Math.abs(t.area - targetArea) <= AREA_TOLERANCE_STRICT
  );

  const weighted = filtered.map(t => {
    // Recency weight
    const recencyWeight = Math.exp(-t.daysAgo / RECENCY_HALFLIFE);

    // Age similarity weight
    let ageWeight = 0.5;
    if (targetBuildingYear && t.buildingYear) {
      const yearDiff = Math.abs(t.buildingYear - targetBuildingYear);
      ageWeight = Math.exp(-yearDiff / AGE_HALFLIFE);
    }

    // Area similarity weight
    const areaDiff = Math.abs(t.area - targetArea);
    const areaWeight = Math.exp(-areaDiff / areaHalfLife);

    // Combined
    const combinedWeight = recencyWeight * ageWeight * areaWeight;

    return {
      ...t,
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

  return { baseValue, effectiveSampleSize };
}

// ═══════════════════════════════════════════════════════════════════
// METHOD 2: PROPOSED APPROACH (Unit Price + Age Adjustment)
// ═══════════════════════════════════════════════════════════════════
function calculateProposedMethod(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number,
  calibration: CalibrationResult
): { baseValue: number; effectiveSampleSize: number; details: any[] } {
  const currentYear = new Date().getFullYear();
  const targetAge = currentYear - targetBuildingYear;

  // Wider area filter (±15%)
  const areaTolerance = targetArea * (AREA_FILTER_PERCENT / 100);
  const filtered = transactions.filter(t =>
    Math.abs(t.area - targetArea) <= areaTolerance && t.unitPrice > 0
  );

  const weighted = filtered.map(t => {
    // 1. Only recency as weight
    const recencyWeight = Math.exp(-t.daysAgo / RECENCY_HALFLIFE);

    // 2. Age adjustment (not weight!)
    let ageAdjustment = 1.0;
    if (targetBuildingYear && t.buildingYear) {
      const comparableAge = currentYear - t.buildingYear;
      // Using calibrated depreciation rate
      const yearDiff = targetBuildingYear - t.buildingYear; // positive = target is newer
      ageAdjustment = 1 + (yearDiff * calibration.annualDepreciation);
      // Clamp to reasonable range
      ageAdjustment = Math.max(0.7, Math.min(1.3, ageAdjustment));
    }

    // 3. Adjusted unit price
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
    baseValue,
    effectiveSampleSize,
    details: weighted.sort((a, b) => b.recencyWeight - a.recencyWeight)
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

  console.log('\n' + '═'.repeat(85));
  console.log('  METHODOLOGY COMPARISON TEST: 신당동 620 201호');
  console.log('═'.repeat(85));
  console.log(`\n  Target: ${TARGET.dong} ${TARGET.address} ${TARGET.unit}`);
  console.log(`  Area: ${TARGET.exclusiveArea}㎡ | Built: ${TARGET.buildingYear} | Floor: ${TARGET.floor}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Fetch all 신당동 transactions (12 months)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(85));
  console.log('  STEP 1: Fetching 신당동 transactions (12 months)');
  console.log('─'.repeat(85));

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
      if (sindangOnly.length > 0) {
        console.log(`  ${yearMonth}: ${sindangOnly.length} transactions`);
      }
    } catch (error) {
      console.error(`  ${yearMonth}: Error fetching`);
    }
  }

  console.log(`\n  Total 신당동 transactions: ${allTransactions.length}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Multiple Regression Calibration
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(85));
  console.log('  STEP 2: Market Calibration (Multiple Regression)');
  console.log('─'.repeat(85));

  const calibration = calibrateWithMultipleRegression(allTransactions);

  console.log('\n  Regression Results:');
  console.log('  ┌───────────────────────────────────────────────────────────────────────────────┐');
  console.log(`  │  Sample Size: ${calibration.sampleSize} transactions with known building year`);
  console.log(`  │  R² (model fit): ${(calibration.rSquared * 100).toFixed(1)}%`);
  console.log(`  │  Age↔DaysAgo Correlation: ${calibration.correlation.toFixed(3)} ${Math.abs(calibration.correlation) > 0.7 ? '⚠️ HIGH' : '✓ OK'}`);
  console.log('  ├───────────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Intercept (new bldg, today): ${(calibration.intercept / 10000).toFixed(0)}만원/㎡`);
  console.log(`  │  Age Coefficient (β₁): ${(calibration.ageCoefficient / 10000).toFixed(2)}만원/㎡ per year of age`);
  console.log(`  │  Trend Coefficient (β₂): ${(calibration.trendCoefficient / 10000).toFixed(4)}만원/㎡ per day ago`);
  console.log('  ├───────────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  → Annual Depreciation Rate: ${(calibration.annualDepreciation * 100).toFixed(2)}%`);
  console.log(`  │  → Annual Market Trend: ${calibration.annualTrend >= 0 ? '+' : ''}${(calibration.annualTrend * 100).toFixed(2)}% ${calibration.annualTrend > 0 ? '(prices rising)' : '(prices falling)'}`);
  console.log('  └───────────────────────────────────────────────────────────────────────────────┘');

  // ─────────────────────────────────────────────────────────────────
  // STEP 3: Calculate with CURRENT method
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(85));
  console.log('  STEP 3: Current Method (Triple-Weight)');
  console.log('─'.repeat(85));

  const current = calculateCurrentMethod(
    allTransactions,
    TARGET.exclusiveArea,
    TARGET.buildingYear
  );

  const maxFloor = Math.max(...allTransactions.map(t => t.floor), TARGET.floor);
  const currentAdjusted = applyFloorAdjustment(current.baseValue, TARGET.floor, maxFloor);

  console.log(`\n  Area filter: ±${AREA_TOLERANCE_STRICT}㎡ (strict)`);
  console.log(`  Weight formula: exp(-days/60) × exp(-|yearDiff|/10) × exp(-|areaDiff|/${(TARGET.exclusiveArea * 0.2).toFixed(1)})`);
  console.log(`  Effective sample size: ${current.effectiveSampleSize.toFixed(1)}`);
  console.log(`  Base value: ${(current.baseValue / 100000000).toFixed(2)}억`);
  console.log(`  After floor adj (×0.95): ${(currentAdjusted / 100000000).toFixed(2)}억`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 4: Calculate with PROPOSED method
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(85));
  console.log('  STEP 4: Proposed Method (Unit Price + Age Adjustment)');
  console.log('─'.repeat(85));

  const proposed = calculateProposedMethod(
    allTransactions,
    TARGET.exclusiveArea,
    TARGET.buildingYear,
    calibration
  );

  const proposedAdjusted = applyFloorAdjustment(proposed.baseValue, TARGET.floor, maxFloor);

  console.log(`\n  Area filter: ±${AREA_FILTER_PERCENT}% (${(TARGET.exclusiveArea * AREA_FILTER_PERCENT / 100).toFixed(1)}㎡)`);
  console.log(`  Weight: recency only (exp(-days/60))`);
  console.log(`  Age adjustment: ×(1 + yearDiff × ${(calibration.annualDepreciation * 100).toFixed(2)}%)`);
  console.log(`  Effective sample size: ${proposed.effectiveSampleSize.toFixed(1)}`);
  console.log(`  Base value: ${(proposed.baseValue / 100000000).toFixed(2)}억`);
  console.log(`  After floor adj (×0.95): ${(proposedAdjusted / 100000000).toFixed(2)}억`);

  // Show top contributing transactions
  console.log('\n  Top 5 contributing transactions:');
  console.log('  Date       │ Amount │ Area   │ Built │ Unit Price │ Age Adj │ Adjusted UP │ Weight');
  console.log('  ' + '─'.repeat(80));
  proposed.details.slice(0, 5).forEach(t => {
    console.log(
      `  ${t.date} │ ${(t.amount/100000000).toFixed(2)}억 │ ${t.area.toFixed(1)}㎡ │ ${t.buildingYear || '????'} │ ` +
      `${(t.unitPrice/10000).toFixed(0)}만/㎡ │ ×${t.ageAdjustment.toFixed(3)} │ ` +
      `${(t.adjustedUnitPrice/10000).toFixed(0)}만/㎡ │ ${t.recencyWeight.toFixed(3)}`
    );
  });

  // ─────────────────────────────────────────────────────────────────
  // STEP 5: Comparison
  // ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(85));
  console.log('  COMPARISON SUMMARY');
  console.log('═'.repeat(85));

  const diff = proposedAdjusted - currentAdjusted;
  const diffPct = (diff / currentAdjusted * 100);

  console.log('\n  ┌─────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │                           CURRENT            PROPOSED           DIFFERENCE      │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Est. Value:               ${(currentAdjusted/100000000).toFixed(2)}억              ${(proposedAdjusted/100000000).toFixed(2)}억              ${diff >= 0 ? '+' : ''}${(diff/100000000).toFixed(2)}억 (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)   │`);
  console.log(`  │  Effective Sample:         ${current.effectiveSampleSize.toFixed(1)}                ${proposed.effectiveSampleSize.toFixed(1)}                               │`);
  console.log(`  │  Age Handling:             Similarity Wt      Adjustment                        │`);
  console.log(`  │  Area Handling:            Similarity Wt      Unit Price                        │`);
  console.log('  └─────────────────────────────────────────────────────────────────────────────────┘');

  console.log('\n  Key Insights:');
  console.log(`  • Calibrated annual depreciation: ${(calibration.annualDepreciation * 100).toFixed(2)}%`);
  console.log(`  • Market trend (separated): ${calibration.annualTrend >= 0 ? '+' : ''}${(calibration.annualTrend * 100).toFixed(2)}% per year`);
  console.log(`  • Proposed method uses ${((proposed.effectiveSampleSize / current.effectiveSampleSize - 1) * 100).toFixed(0)}% more effective data`);

  if (Math.abs(calibration.correlation) > 0.7) {
    console.log('\n  ⚠️  WARNING: High correlation between age and daysAgo.');
    console.log('     Consider using time-windowed calibration for more robust results.');
  }

  console.log('\n' + '═'.repeat(85));
  console.log('  TEST COMPLETE');
  console.log('═'.repeat(85) + '\n');
}

main().catch(console.error);
