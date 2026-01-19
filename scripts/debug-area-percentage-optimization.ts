/**
 * Test percentage-based area filtering and weighting
 *
 * Compare:
 *   - Filter: ±10%, ±15%, ±20%, ±25%, ±30%
 *   - Weight half-life: 5%, 10%, 15%, 20%, 25% of target area
 *
 * Run with: npx tsx scripts/debug-area-percentage-optimization.ts
 */

import 'dotenv/config';
import axios from 'axios';

interface Transaction {
  date: string;
  amount: number;
  area: number;
  floor: number;
  buildingYear?: number;
}

const RECENCY_HALFLIFE = 60;
const AGE_HALFLIFE = 10;

async function fetchTransactions(apiKey: string, lawdCd: string): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const yearMonth = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    try {
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

      const sindangOnly = transactions
        .filter((item: any) => item.umdNm?.trim() === '신당동')
        .map((item: any) => ({
          date: `${item.dealYear}-${String(item.dealMonth).padStart(2, '0')}-${String(item.dealDay).padStart(2, '0')}`,
          amount: parseInt(String(item.dealAmount).replace(/,/g, '')) * 10000,
          area: parseFloat(item.excluUseAr || '0'),
          floor: parseInt(item.floor || '1'),
          buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined
        }));

      allTransactions.push(...sindangOnly);
    } catch (error) {
      // Continue
    }
  }

  return allTransactions;
}

function calculateEstValue(
  transactions: Transaction[],
  targetArea: number,
  targetBuildingYear: number,
  targetFloor: number,
  filterPct: number | null, // percentage, e.g., 10 = ±10%
  weightHalfLifePct: number // percentage, e.g., 10 = 10% of target area
): {
  estValue: number;
  txnCount: number;
  effectiveSampleSize: number;
  filterRange: string;
  halfLifeAbsolute: number;
} {
  const now = new Date();

  // Convert percentage to absolute values
  const filterAbsolute = filterPct !== null ? targetArea * (filterPct / 100) : null;
  const halfLifeAbsolute = targetArea * (weightHalfLifePct / 100);

  // Filter by area
  let filtered = transactions;
  if (filterAbsolute !== null) {
    filtered = transactions.filter(t => Math.abs(t.area - targetArea) <= filterAbsolute);
  }

  const filterRange = filterAbsolute !== null
    ? `${(targetArea - filterAbsolute).toFixed(1)} ~ ${(targetArea + filterAbsolute).toFixed(1)}㎡`
    : 'No filter';

  if (filtered.length === 0) {
    return { estValue: 0, txnCount: 0, effectiveSampleSize: 0, filterRange, halfLifeAbsolute };
  }

  // Calculate weights
  const weighted = filtered.map(t => {
    const txnDate = new Date(t.date);
    const daysAgo = Math.floor((now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));

    // Recency weight
    const recencyWeight = Math.exp(-daysAgo / RECENCY_HALFLIFE);

    // Age weight
    let ageWeight = 0.5;
    if (targetBuildingYear && t.buildingYear) {
      const yearDiff = Math.abs(t.buildingYear - targetBuildingYear);
      ageWeight = Math.exp(-yearDiff / AGE_HALFLIFE);
    }

    // Area weight (percentage-based)
    const areaDiff = Math.abs(t.area - targetArea);
    const areaWeight = Math.exp(-areaDiff / halfLifeAbsolute);

    const combinedWeight = recencyWeight * ageWeight * areaWeight;

    return {
      weight: combinedWeight,
      weightedAmount: t.amount * combinedWeight
    };
  });

  const totalWeight = weighted.reduce((sum, t) => sum + t.weight, 0);
  const totalWeightedAmount = weighted.reduce((sum, t) => sum + t.weightedAmount, 0);
  const baseValue = totalWeightedAmount / totalWeight;

  // Effective sample size
  const sumWeightsSq = Math.pow(totalWeight, 2);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.weight, 2), 0);
  const effectiveSampleSize = sumWeightsSq / sumSqWeights;

  // Floor adjustment
  const floorMultiplier = targetFloor === 1 ? 0.88 : targetFloor === 2 ? 0.95 : 1.0;
  const estValue = baseValue * floorMultiplier;

  return { estValue, txnCount: filtered.length, effectiveSampleSize, filterRange, halfLifeAbsolute };
}

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ MOLIT_API_KEY not set');
    process.exit(1);
  }

  const TARGET = {
    area: 61.78,
    buildingYear: 2000,
    floor: 2
  };

  const ACTUAL_TRANSACTION = 5.6;

  console.log('\n' + '═'.repeat(100));
  console.log('📊 PERCENTAGE-BASED AREA WEIGHT OPTIMIZATION');
  console.log('═'.repeat(100));
  console.log(`\nTarget: ${TARGET.area}㎡, Built ${TARGET.buildingYear}, ${TARGET.floor}층`);
  console.log(`Reference: Actual transaction ₩${ACTUAL_TRANSACTION}억 (Nov 2025)\n`);

  console.log('Fetching transactions...');
  const transactions = await fetchTransactions(apiKey, '11140');
  console.log(`✓ Loaded ${transactions.length} 신당동 transactions\n`);

  const filterPcts = [10, 15, 20, 25, 30, null]; // null = no filter
  const weightHalfLifePcts = [5, 10, 15, 20, 25];

  // Show what percentages mean in absolute terms
  console.log('═'.repeat(100));
  console.log(`PERCENTAGE TO ABSOLUTE CONVERSION (for ${TARGET.area}㎡ target)`);
  console.log('═'.repeat(100));
  console.log('\n  Percentage │ Absolute │ Range');
  console.log('  ' + '─'.repeat(50));
  for (const pct of [5, 10, 15, 20, 25, 30]) {
    const abs = TARGET.area * (pct / 100);
    console.log(`  ±${String(pct).padStart(2)}%       │ ±${abs.toFixed(1).padStart(5)}㎡ │ ${(TARGET.area - abs).toFixed(1)} ~ ${(TARGET.area + abs).toFixed(1)}㎡`);
  }

  console.log('\n' + '═'.repeat(100));
  console.log('COMPARISON MATRIX: Filter % × Half-Life %');
  console.log('═'.repeat(100));

  // Header
  console.log('\n  Filter     │' + weightHalfLifePcts.map(h => ` HL=${h}% `.padStart(11)).join('│'));
  console.log('  ' + '─'.repeat(11) + '┼' + weightHalfLifePcts.map(() => '─'.repeat(11)).join('┼'));

  const results: { filterPct: number | null; halfLifePct: number; estValue: number; ess: number; error: number; txnCount: number }[] = [];

  for (const filterPct of filterPcts) {
    const filterLabel = filterPct === null ? 'No filter' : `±${filterPct}%`;
    let row = `  ${filterLabel.padEnd(10)} │`;

    for (const halfLifePct of weightHalfLifePcts) {
      const result = calculateEstValue(
        transactions,
        TARGET.area,
        TARGET.buildingYear,
        TARGET.floor,
        filterPct,
        halfLifePct
      );

      const error = Math.abs(result.estValue / 100000000 - ACTUAL_TRANSACTION);
      results.push({
        filterPct,
        halfLifePct,
        estValue: result.estValue,
        ess: result.effectiveSampleSize,
        error,
        txnCount: result.txnCount
      });

      row += ` ${(result.estValue / 100000000).toFixed(2)}억 `.padStart(11) + '│';
    }

    console.log(row.slice(0, -1));
  }

  // Error matrix
  console.log('\n' + '═'.repeat(100));
  console.log('ERROR FROM ACTUAL TRANSACTION (₩5.6억) - Lower is better');
  console.log('═'.repeat(100));

  console.log('\n  Filter     │' + weightHalfLifePcts.map(h => ` HL=${h}% `.padStart(11)).join('│'));
  console.log('  ' + '─'.repeat(11) + '┼' + weightHalfLifePcts.map(() => '─'.repeat(11)).join('┼'));

  for (const filterPct of filterPcts) {
    const filterLabel = filterPct === null ? 'No filter' : `±${filterPct}%`;
    let row = `  ${filterLabel.padEnd(10)} │`;

    for (const halfLifePct of weightHalfLifePcts) {
      const r = results.find(x => x.filterPct === filterPct && x.halfLifePct === halfLifePct)!;
      const marker = r.error < 0.1 ? '✓' : ' ';
      row += `${marker}${r.error.toFixed(2)}억`.padStart(11) + '│';
    }

    console.log(row.slice(0, -1));
  }

  // Transaction count matrix
  console.log('\n' + '═'.repeat(100));
  console.log('TRANSACTION COUNT');
  console.log('═'.repeat(100));

  console.log('\n  Filter     │ Txn Count │ Absolute Range');
  console.log('  ' + '─'.repeat(50));

  for (const filterPct of filterPcts) {
    const filterLabel = filterPct === null ? 'No filter' : `±${filterPct}%`;
    const r = results.find(x => x.filterPct === filterPct)!;
    const absRange = filterPct === null
      ? 'All'
      : `${(TARGET.area * (1 - filterPct/100)).toFixed(1)} ~ ${(TARGET.area * (1 + filterPct/100)).toFixed(1)}㎡`;
    console.log(`  ${filterLabel.padEnd(10)} │ ${String(r.txnCount).padStart(9)} │ ${absRange}`);
  }

  // ESS matrix
  console.log('\n' + '═'.repeat(100));
  console.log('EFFECTIVE SAMPLE SIZE (ESS) - Higher is better');
  console.log('═'.repeat(100));

  console.log('\n  Filter     │' + weightHalfLifePcts.map(h => ` HL=${h}% `.padStart(11)).join('│'));
  console.log('  ' + '─'.repeat(11) + '┼' + weightHalfLifePcts.map(() => '─'.repeat(11)).join('┼'));

  for (const filterPct of filterPcts) {
    const filterLabel = filterPct === null ? 'No filter' : `±${filterPct}%`;
    let row = `  ${filterLabel.padEnd(10)} │`;

    for (const halfLifePct of weightHalfLifePcts) {
      const r = results.find(x => x.filterPct === filterPct && x.halfLifePct === halfLifePct)!;
      row += `${r.ess.toFixed(1)}`.padStart(11) + '│';
    }

    console.log(row.slice(0, -1));
  }

  // Top configurations
  console.log('\n' + '═'.repeat(100));
  console.log('TOP 10 CONFIGURATIONS (by error from actual transaction)');
  console.log('═'.repeat(100));

  const sorted = [...results].sort((a, b) => a.error - b.error);

  console.log('\n  Rank │ Filter   │ Half-Life │ Abs HL │ Est.Value │ Error   │ ESS   │ Txns');
  console.log('  ' + '─'.repeat(75));

  sorted.slice(0, 10).forEach((r, i) => {
    const filterLabel = r.filterPct === null ? 'No filter' : `±${r.filterPct}%`;
    const absHL = (TARGET.area * r.halfLifePct / 100).toFixed(1);
    console.log(
      `  ${String(i + 1).padStart(4)} │ ${filterLabel.padEnd(8)} │ ${String(r.halfLifePct).padStart(5)}%    │ ${absHL.padStart(5)}㎡ │ ` +
      `${(r.estValue / 100000000).toFixed(2)}억    │ ${r.error.toFixed(2)}억   │ ${r.ess.toFixed(1).padStart(5)} │ ${r.txnCount}`
    );
  });

  // Comparison: Absolute vs Percentage
  console.log('\n' + '═'.repeat(100));
  console.log('COMPARISON: ABSOLUTE vs PERCENTAGE APPROACH');
  console.log('═'.repeat(100));

  const absConfig = { filter: 10, halfLife: 10 }; // ±10㎡, HL=10㎡
  const pctConfig = { filter: 15, halfLife: 15 }; // ±15%, HL=15%

  const absResult = calculateEstValue(transactions, TARGET.area, TARGET.buildingYear, TARGET.floor, null, absConfig.halfLife);
  // For absolute, we need to convert back - but let's just show percentage results

  const pctResult = results.find(r => r.filterPct === pctConfig.filter && r.halfLifePct === pctConfig.halfLife)!;

  console.log(`
  For target ${TARGET.area}㎡:

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Approach        │ Filter Range        │ HL (absolute) │ Est.Value │ Error │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  Absolute ±10㎡   │ 51.8 ~ 71.8㎡        │ 10.0㎡         │ (see prev)│       │
  │  Percentage ±15% │ 52.5 ~ 71.0㎡        │ 9.3㎡          │ ${(pctResult.estValue/100000000).toFixed(2)}억    │ ${pctResult.error.toFixed(2)}억 │
  └─────────────────────────────────────────────────────────────────────────────┘

  Percentage approach benefits:
  - Scales naturally with property size
  - 30㎡ unit: ±15% = ±4.5㎡ (tight)
  - 100㎡ unit: ±15% = ±15㎡ (appropriate)
`);

  // Final recommendation
  console.log('═'.repeat(100));
  console.log('RECOMMENDATION');
  console.log('═'.repeat(100));

  const best = sorted[0];
  const bestAbsHL = (TARGET.area * best.halfLifePct / 100).toFixed(1);

  console.log(`
  RECOMMENDED CONFIGURATION:

  ┌────────────────────────────────────────────────────────────────────────────┐
  │  Parameter        │ Value                                                 │
  ├────────────────────────────────────────────────────────────────────────────┤
  │  Filter Range     │ ±${best.filterPct || 'No'}% (absolute: ±${best.filterPct ? (TARGET.area * best.filterPct / 100).toFixed(1) : '∞'}㎡)              │
  │  Area Half-Life   │ ${best.halfLifePct}% of target area (= ${bestAbsHL}㎡ for ${TARGET.area}㎡)     │
  │  Age Half-Life    │ 10 years                                              │
  │  Recency Half-Life│ 60 days                                               │
  └────────────────────────────────────────────────────────────────────────────┘

  Triple-Weight Formula (percentage-based):

    weight = exp(-daysAgo/60) × exp(-|yearDiff|/10) × exp(-|areaDiff|/(targetArea×${best.halfLifePct/100}))
             ↑ recency         ↑ age                 ↑ area (${best.halfLifePct}% of target)

  Results:
    - Est.Value: ₩${(best.estValue / 100000000).toFixed(2)}억
    - Error: ₩${best.error.toFixed(2)}억
    - ESS: ${best.ess.toFixed(1)}
    - Transactions: ${best.txnCount}
`);

  console.log('═'.repeat(100) + '\n');
}

main().catch(console.error);
