/**
 * Full Est.Value calculation for 연립다세대 with Age Similarity Weighting
 *
 * Combined Weight = Recency Weight × Age Similarity Weight
 *   - Recency Weight = exp(-daysAgo / 60)       // 60-day half-life
 *   - Age Similarity = exp(-|yearDiff| / 10)    // 10-year half-life
 *
 * Run with: npx tsx scripts/debug-estvalue-with-age.ts
 */

import 'dotenv/config';
import axios from 'axios';

interface Transaction {
  date: string;
  amount: number;
  area: number;
  floor: number;
  buildingYear?: number;
  buildingName?: string;
  legalDong: string;
}

interface WeightedTransaction extends Transaction {
  daysAgo: number;
  yearDiff: number | null;
  recencyWeight: number;
  ageWeight: number;
  combinedWeight: number;
  weightedAmount: number;
}

const RECENCY_HALFLIFE = 60;  // days
const AGE_HALFLIFE = 10;      // years
const AREA_TOLERANCE = 2;     // ㎡

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

  return transactions.map((item: any) => ({
    date: `${item.dealYear}-${String(item.dealMonth).padStart(2, '0')}-${String(item.dealDay).padStart(2, '0')}`,
    amount: parseInt(String(item.dealAmount).replace(/,/g, '')) * 10000,
    area: parseFloat(item.excluUseAr || '0'),
    floor: parseInt(item.floor || '1'),
    buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined,
    buildingName: item.aptNm?.trim() || '',
    legalDong: item.umdNm?.trim() || ''
  }));
}

function calculateWeights(
  transactions: Transaction[],
  targetBuildingYear: number | undefined,
  targetArea: number
): WeightedTransaction[] {
  const now = new Date();

  return transactions.map(t => {
    const txnDate = new Date(t.date);
    const daysAgo = Math.floor((now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));

    // Recency weight: exp(-daysAgo / 60)
    const recencyWeight = Math.exp(-daysAgo / RECENCY_HALFLIFE);

    // Age similarity weight
    let yearDiff: number | null = null;
    let ageWeight: number;

    if (targetBuildingYear && t.buildingYear) {
      yearDiff = Math.abs(t.buildingYear - targetBuildingYear);
      ageWeight = Math.exp(-yearDiff / AGE_HALFLIFE);
    } else {
      // Default 50% weight when building year unknown
      ageWeight = 0.5;
    }

    // Combined weight
    const combinedWeight = recencyWeight * ageWeight;
    const weightedAmount = t.amount * combinedWeight;

    return {
      ...t,
      daysAgo,
      yearDiff,
      recencyWeight,
      ageWeight,
      combinedWeight,
      weightedAmount
    };
  });
}

function applyFloorAdjustment(baseValue: number, floor: number, maxFloor: number): number {
  if (floor === 1) return baseValue * 0.88;      // -12%
  if (floor === 2) return baseValue * 0.95;      // -5%
  if (floor === maxFloor) return baseValue * 0.97; // -3%

  const relativePosition = floor / maxFloor;
  if (relativePosition >= 0.5 && relativePosition <= 0.8) {
    return baseValue * 1.05; // +5%
  }

  return baseValue;
}

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ MOLIT_API_KEY not set');
    process.exit(1);
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
    exclusiveArea: 61.78,      // ㎡ (from Nov 2025 transaction)
    buildingYear: 2000,        // Assumed - adjust if known
  };

  const lawdCd = '11140'; // 중구

  console.log('\n' + '═'.repeat(80));
  console.log('📊 FULL EST.VALUE CALCULATION WITH AGE SIMILARITY WEIGHTING');
  console.log('═'.repeat(80));
  console.log('\n┌─ Target Property ─────────────────────────────────────────────────────────┐');
  console.log(`│  Address: ${TARGET.city} ${TARGET.district} ${TARGET.dong} ${TARGET.address} ${TARGET.unit}`);
  console.log(`│  Floor: ${TARGET.floor}층`);
  console.log(`│  Exclusive Area: ${TARGET.exclusiveArea}㎡`);
  console.log(`│  Built Year: ${TARGET.buildingYear}`);
  console.log('└───────────────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─ Weighting Parameters ────────────────────────────────────────────────────┐');
  console.log(`│  Recency Half-life: ${RECENCY_HALFLIFE} days`);
  console.log(`│  Age Similarity Half-life: ${AGE_HALFLIFE} years`);
  console.log(`│  Area Tolerance: ±${AREA_TOLERANCE}㎡`);
  console.log(`│  Formula: Combined Weight = exp(-daysAgo/${RECENCY_HALFLIFE}) × exp(-|yearDiff|/${AGE_HALFLIFE})`);
  console.log('└───────────────────────────────────────────────────────────────────────────┘');

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: FETCH TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 1: Fetching 신당동 multifamily transactions (12 months)');
  console.log('─'.repeat(80));

  const allTransactions: Transaction[] = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

    try {
      const monthData = await fetchMultifamilyTransactions(apiKey, lawdCd, yearMonth);
      const sindangOnly = monthData.filter(t => t.legalDong === '신당동');
      allTransactions.push(...sindangOnly);
      if (sindangOnly.length > 0) {
        console.log(`  ${yearMonth}: ${sindangOnly.length} transactions`);
      }
    } catch (error) {
      console.error(`  ${yearMonth}: Error`);
    }
  }

  console.log(`\n  ✓ Total 신당동 transactions: ${allTransactions.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: FILTER BY AREA
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log(`STEP 2: Filter by area ${TARGET.exclusiveArea}㎡ (±${AREA_TOLERANCE}㎡)`);
  console.log('─'.repeat(80));

  const areaFiltered = allTransactions.filter(t =>
    Math.abs(t.area - TARGET.exclusiveArea) <= AREA_TOLERANCE
  );

  console.log(`  ✓ Matched ${areaFiltered.length} transactions within area tolerance`);

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: CALCULATE WEIGHTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 3: Calculate Combined Weights (Recency × Age Similarity)');
  console.log('─'.repeat(80));

  const weighted = calculateWeights(areaFiltered, TARGET.buildingYear, TARGET.exclusiveArea)
    .sort((a, b) => b.combinedWeight - a.combinedWeight); // Sort by influence

  console.log('\n  Transactions sorted by influence (combined weight):');
  console.log('  ' + '─'.repeat(76));
  console.log('  Date       │ Amount │ Area  │ Flr │ Built │ Days │ YrDiff │ Recency │ Age Wt │ Combined');
  console.log('  ' + '─'.repeat(76));

  weighted.forEach(t => {
    const amountStr = (t.amount / 100000000).toFixed(2) + '억';
    const areaStr = t.area.toFixed(1) + '㎡';
    const builtStr = t.buildingYear ? String(t.buildingYear) : '????';
    const yrDiffStr = t.yearDiff !== null ? String(t.yearDiff) : '-';

    console.log(
      `  ${t.date} │ ${amountStr.padStart(6)} │ ${areaStr.padStart(6)} │ ${String(t.floor).padStart(3)} │ ${builtStr} │ ${String(t.daysAgo).padStart(4)} │ ${yrDiffStr.padStart(6)} │ ${t.recencyWeight.toFixed(3).padStart(7)} │ ${t.ageWeight.toFixed(3).padStart(6)} │ ${t.combinedWeight.toFixed(4)}`
    );
  });
  console.log('  ' + '─'.repeat(76));

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4: CALCULATE WEIGHTED AVERAGE
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 4: Calculate Weighted Average');
  console.log('─'.repeat(80));

  const totalWeightedAmount = weighted.reduce((sum, t) => sum + t.weightedAmount, 0);
  const totalWeight = weighted.reduce((sum, t) => sum + t.combinedWeight, 0);
  const baseValue = totalWeightedAmount / totalWeight;

  console.log('\n  Calculation:');
  console.log('  ┌────────────────────────────────────────────────────────────────────────┐');

  weighted.slice(0, 5).forEach((t, i) => {
    const contribution = (t.weightedAmount / totalWeightedAmount * 100).toFixed(1);
    console.log(`  │  ${i + 1}. ${(t.amount/100000000).toFixed(2)}억 × ${t.combinedWeight.toFixed(4)} = ${(t.weightedAmount/100000000).toFixed(4)}억 (${contribution}% of total)`);
  });
  if (weighted.length > 5) {
    console.log(`  │  ... and ${weighted.length - 5} more transactions`);
  }

  console.log('  ├────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Σ(Amount × Weight) = ${(totalWeightedAmount/100000000).toFixed(4)}억`);
  console.log(`  │  Σ(Weight)          = ${totalWeight.toFixed(4)}`);
  console.log('  ├────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Base Value = ${(totalWeightedAmount/100000000).toFixed(4)}억 ÷ ${totalWeight.toFixed(4)} = ${(baseValue/100000000).toFixed(2)}억`);
  console.log('  └────────────────────────────────────────────────────────────────────────┘');

  // ═══════════════════════════════════════════════════════════════════
  // STEP 5: FLOOR ADJUSTMENT
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 5: Floor Adjustment');
  console.log('─'.repeat(80));

  const maxFloor = Math.max(...weighted.map(t => t.floor), TARGET.floor);
  const floorMultiplier = TARGET.floor === 1 ? 0.88
    : TARGET.floor === 2 ? 0.95
    : TARGET.floor === maxFloor ? 0.97
    : 1.0;

  const adjustedValue = baseValue * floorMultiplier;

  console.log(`\n  Floor: ${TARGET.floor}층 (max in data: ${maxFloor}층)`);
  console.log('  ┌────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Floor Adjustment Table:                                              │');
  console.log('  │    1층: ×0.88 (-12%)  │  2층: ×0.95 (-5%)  │  Top: ×0.97 (-3%)       │');
  console.log('  │    Mid-high (50-80%): ×1.05 (+5%)  │  Others: ×1.00                  │');
  console.log('  ├────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Applied: ×${floorMultiplier} (${TARGET.floor}층 adjustment)`);
  console.log(`  │  ${(baseValue/100000000).toFixed(2)}억 × ${floorMultiplier} = ${(adjustedValue/100000000).toFixed(2)}억`);
  console.log('  └────────────────────────────────────────────────────────────────────────┘');

  // ═══════════════════════════════════════════════════════════════════
  // STEP 6: FINAL RESULT
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('STEP 6: Final Est.Value');
  console.log('─'.repeat(80));

  const valueLow = adjustedValue * 0.95;
  const valueMid = adjustedValue;
  const valueHigh = adjustedValue * 1.05;

  console.log('\n  ┌────────────────────────────────────────────────────────────────────────┐');
  console.log(`  │                                                                        │`);
  console.log(`  │     📊 EST.VALUE: ₩${(valueMid/100000000).toFixed(2)}억                                            │`);
  console.log(`  │                                                                        │`);
  console.log(`  │     Range: ₩${(valueLow/100000000).toFixed(2)}억 ~ ₩${(valueHigh/100000000).toFixed(2)}억 (±5%)                            │`);
  console.log(`  │                                                                        │`);
  console.log('  └────────────────────────────────────────────────────────────────────────┘');

  // ═══════════════════════════════════════════════════════════════════
  // COMPARISON: WITH vs WITHOUT AGE WEIGHTING
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(80));
  console.log('COMPARISON: With vs Without Age Similarity Weighting');
  console.log('─'.repeat(80));

  // Calculate without age weighting (recency only)
  const withoutAge = areaFiltered.map(t => {
    const txnDate = new Date(t.date);
    const daysAgo = Math.floor((today.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
    const recencyWeight = Math.exp(-daysAgo / RECENCY_HALFLIFE);
    return {
      ...t,
      weight: recencyWeight,
      weightedAmount: t.amount * recencyWeight
    };
  });

  const totalWeightNoAge = withoutAge.reduce((sum, t) => sum + t.weight, 0);
  const totalAmountNoAge = withoutAge.reduce((sum, t) => sum + t.weightedAmount, 0);
  const baseValueNoAge = totalAmountNoAge / totalWeightNoAge;
  const adjustedNoAge = baseValueNoAge * floorMultiplier;

  console.log('\n  ┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('  │                          Without Age Wt    With Age Wt     Difference  │');
  console.log('  ├─────────────────────────────────────────────────────────────────────────┤');
  console.log(`  │  Base Value:             ₩${(baseValueNoAge/100000000).toFixed(2)}억          ₩${(baseValue/100000000).toFixed(2)}억         ${((baseValue - baseValueNoAge)/100000000).toFixed(2)}억     │`);
  console.log(`  │  After Floor Adj:        ₩${(adjustedNoAge/100000000).toFixed(2)}억          ₩${(adjustedValue/100000000).toFixed(2)}억         ${((adjustedValue - adjustedNoAge)/100000000).toFixed(2)}억     │`);
  console.log('  └─────────────────────────────────────────────────────────────────────────┘');

  const pctDiff = ((adjustedValue - adjustedNoAge) / adjustedNoAge * 100).toFixed(1);
  console.log(`\n  → Age weighting changed Est.Value by ${pctDiff}%`);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ CALCULATION COMPLETE');
  console.log('═'.repeat(80) + '\n');
}

main().catch(console.error);
