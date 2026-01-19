/**
 * Find optimal area weight half-life for triple-weighted approach
 *
 * Test combinations of:
 *   - Filter range: ±5㎡, ±10㎡, ±15㎡, ±20㎡, no filter
 *   - Area weight half-life: 2, 3, 5, 7, 10, 15㎡
 *
 * Evaluation criteria:
 *   1. Est.Value closeness to actual transaction (₩5.6억)
 *   2. Effective sample size (sum of weights)
 *   3. Stability (low sensitivity to parameter changes)
 *
 * Run with: npx tsx scripts/debug-area-weight-optimization.ts
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
  areaFilterRange: number | null, // null = no filter
  areaWeightHalfLife: number
): {
  estValue: number;
  txnCount: number;
  effectiveSampleSize: number;
  topContributors: { area: number; amount: number; weight: number; contribution: number }[];
} {
  const now = new Date();

  // Filter by area (if range specified)
  let filtered = transactions;
  if (areaFilterRange !== null) {
    filtered = transactions.filter(t => Math.abs(t.area - targetArea) <= areaFilterRange);
  }

  if (filtered.length === 0) {
    return { estValue: 0, txnCount: 0, effectiveSampleSize: 0, topContributors: [] };
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

    // Area weight
    const areaDiff = Math.abs(t.area - targetArea);
    const areaWeight = Math.exp(-areaDiff / areaWeightHalfLife);

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

  const totalWeight = weighted.reduce((sum, t) => sum + t.combinedWeight, 0);
  const totalWeightedAmount = weighted.reduce((sum, t) => sum + t.weightedAmount, 0);
  const baseValue = totalWeightedAmount / totalWeight;

  // Effective sample size: (Σw)² / Σw²
  const sumWeightsSq = Math.pow(totalWeight, 2);
  const sumSqWeights = weighted.reduce((sum, t) => sum + Math.pow(t.combinedWeight, 2), 0);
  const effectiveSampleSize = sumWeightsSq / sumSqWeights;

  // Floor adjustment
  const floorMultiplier = targetFloor === 1 ? 0.88 : targetFloor === 2 ? 0.95 : 1.0;
  const estValue = baseValue * floorMultiplier;

  // Top contributors
  const sorted = weighted.sort((a, b) => b.combinedWeight - a.combinedWeight);
  const topContributors = sorted.slice(0, 5).map(t => ({
    area: t.area,
    amount: t.amount,
    weight: t.combinedWeight,
    contribution: (t.weightedAmount / totalWeightedAmount) * 100
  }));

  return { estValue, txnCount: filtered.length, effectiveSampleSize, topContributors };
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

  const ACTUAL_TRANSACTION = 5.6; // ₩5.6억 from Nov 2025

  console.log('\n' + '═'.repeat(95));
  console.log('📊 OPTIMAL AREA WEIGHT CONFIGURATION FOR TRIPLE-WEIGHTED APPROACH');
  console.log('═'.repeat(95));
  console.log(`\nTarget: ${TARGET.area}㎡, Built ${TARGET.buildingYear}, ${TARGET.floor}층`);
  console.log(`Reference: Actual transaction ₩${ACTUAL_TRANSACTION}억 (Nov 2025)\n`);

  console.log('Fetching transactions...');
  const transactions = await fetchTransactions(apiKey, '11140');
  console.log(`✓ Loaded ${transactions.length} 신당동 transactions\n`);

  const filterRanges = [5, 10, 15, 20, null]; // null = no filter
  const areaHalfLives = [2, 3, 5, 7, 10, 15];

  console.log('═'.repeat(95));
  console.log('COMPARISON MATRIX: Filter Range × Area Half-Life');
  console.log('═'.repeat(95));

  // Header
  console.log('\n  Filter    │' + areaHalfLives.map(h => ` HL=${h}㎡ `.padStart(10)).join('│'));
  console.log('  ' + '─'.repeat(10) + '┼' + areaHalfLives.map(() => '─'.repeat(10)).join('┼'));

  const results: { filter: number | null; halfLife: number; estValue: number; ess: number; error: number }[] = [];

  for (const filter of filterRanges) {
    const filterLabel = filter === null ? 'No filter' : `±${filter}㎡`;
    let row = `  ${filterLabel.padEnd(9)} │`;

    for (const halfLife of areaHalfLives) {
      const result = calculateEstValue(
        transactions,
        TARGET.area,
        TARGET.buildingYear,
        TARGET.floor,
        filter,
        halfLife
      );

      const error = Math.abs(result.estValue / 100000000 - ACTUAL_TRANSACTION);
      results.push({ filter, halfLife, estValue: result.estValue, ess: result.effectiveSampleSize, error });

      row += ` ${(result.estValue / 100000000).toFixed(2)}억 `.padStart(10) + '│';
    }

    console.log(row.slice(0, -1)); // Remove trailing │
  }

  // Error from actual transaction
  console.log('\n' + '═'.repeat(95));
  console.log('ERROR FROM ACTUAL TRANSACTION (₩5.6억) - Lower is better');
  console.log('═'.repeat(95));

  console.log('\n  Filter    │' + areaHalfLives.map(h => ` HL=${h}㎡ `.padStart(10)).join('│'));
  console.log('  ' + '─'.repeat(10) + '┼' + areaHalfLives.map(() => '─'.repeat(10)).join('┼'));

  for (const filter of filterRanges) {
    const filterLabel = filter === null ? 'No filter' : `±${filter}㎡`;
    let row = `  ${filterLabel.padEnd(9)} │`;

    for (const halfLife of areaHalfLives) {
      const r = results.find(x => x.filter === filter && x.halfLife === halfLife)!;
      const errorStr = `${r.error < 0.1 ? '✓' : ' '}${r.error.toFixed(2)}억`;
      row += errorStr.padStart(10) + '│';
    }

    console.log(row.slice(0, -1));
  }

  // Effective Sample Size
  console.log('\n' + '═'.repeat(95));
  console.log('EFFECTIVE SAMPLE SIZE (ESS) - Higher is better');
  console.log('═'.repeat(95));

  console.log('\n  Filter    │' + areaHalfLives.map(h => ` HL=${h}㎡ `.padStart(10)).join('│'));
  console.log('  ' + '─'.repeat(10) + '┼' + areaHalfLives.map(() => '─'.repeat(10)).join('┼'));

  for (const filter of filterRanges) {
    const filterLabel = filter === null ? 'No filter' : `±${filter}㎡`;
    let row = `  ${filterLabel.padEnd(9)} │`;

    for (const halfLife of areaHalfLives) {
      const r = results.find(x => x.filter === filter && x.halfLife === halfLife)!;
      row += `${r.ess.toFixed(1)}`.padStart(10) + '│';
    }

    console.log(row.slice(0, -1));
  }

  // Find best configurations
  console.log('\n' + '═'.repeat(95));
  console.log('TOP 10 CONFIGURATIONS (by error from actual transaction)');
  console.log('═'.repeat(95));

  const sorted = [...results].sort((a, b) => a.error - b.error);

  console.log('\n  Rank │ Filter    │ Half-Life │ Est.Value │ Error   │ ESS');
  console.log('  ' + '─'.repeat(60));

  sorted.slice(0, 10).forEach((r, i) => {
    const filterLabel = r.filter === null ? 'No filter' : `±${r.filter}㎡`;
    console.log(
      `  ${String(i + 1).padStart(4)} │ ${filterLabel.padEnd(9)} │ ${String(r.halfLife).padStart(5)}㎡    │ ` +
      `${(r.estValue / 100000000).toFixed(2)}억    │ ${r.error.toFixed(2)}억   │ ${r.ess.toFixed(1)}`
    );
  });

  // Detailed breakdown of best config
  const best = sorted[0];
  console.log('\n' + '═'.repeat(95));
  console.log(`BEST CONFIGURATION: Filter ±${best.filter}㎡, Area Half-Life ${best.halfLife}㎡`);
  console.log('═'.repeat(95));

  const bestResult = calculateEstValue(
    transactions,
    TARGET.area,
    TARGET.buildingYear,
    TARGET.floor,
    best.filter,
    best.halfLife
  );

  console.log(`\n  Est.Value: ₩${(bestResult.estValue / 100000000).toFixed(2)}억`);
  console.log(`  Transactions: ${bestResult.txnCount}`);
  console.log(`  Effective Sample Size: ${bestResult.effectiveSampleSize.toFixed(1)}`);
  console.log(`  Error from actual: ₩${best.error.toFixed(2)}억`);

  console.log('\n  Top Contributors:');
  console.log('  ' + '─'.repeat(50));
  bestResult.topContributors.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.area.toFixed(1)}㎡, ₩${(t.amount / 100000000).toFixed(2)}억 (weight: ${t.weight.toFixed(3)}, ${t.contribution.toFixed(1)}%)`);
  });

  // Recommendation
  console.log('\n' + '═'.repeat(95));
  console.log('RECOMMENDATION');
  console.log('═'.repeat(95));

  // Find configs with good balance of error and ESS
  const balanced = sorted.filter(r => r.ess >= 3).slice(0, 5);

  console.log(`
  For production use, consider:

  1. BEST ACCURACY: Filter ±${best.filter}㎡, Half-Life ${best.halfLife}㎡
     - Est.Value: ₩${(best.estValue / 100000000).toFixed(2)}억
     - Error: ₩${best.error.toFixed(2)}억
     - ESS: ${best.ess.toFixed(1)}

  2. BALANCED (ESS ≥ 3):
${balanced.map((r, i) => `     ${i + 1}. Filter ±${r.filter}㎡, HL=${r.halfLife}㎡ → ₩${(r.estValue / 100000000).toFixed(2)}억 (err: ${r.error.toFixed(2)}억, ESS: ${r.ess.toFixed(1)})`).join('\n')}

  Triple-Weight Formula:
    weight = exp(-daysAgo/${RECENCY_HALFLIFE}) × exp(-|yearDiff|/${AGE_HALFLIFE}) × exp(-|areaDiff|/${best.halfLife})
             ↑ recency              ↑ age                   ↑ area
`);

  console.log('═'.repeat(95) + '\n');
}

main().catch(console.error);
