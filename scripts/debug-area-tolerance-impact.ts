/**
 * Impact of Area Tolerance Change on Est.Value
 *
 * Compare ±2㎡, ±3㎡, ±4㎡, ±5㎡, ±6㎡, ±7㎡, ±8㎡, ±10㎡
 *
 * Run with: npx tsx scripts/debug-area-tolerance-impact.ts
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
  areaTolerance: number,
  useAgeWeight: boolean
): {
  estValue: number;
  txnCount: number;
  baseValue: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  stdDev: number;
} {
  const now = new Date();

  // Filter by area
  const filtered = transactions.filter(t => Math.abs(t.area - targetArea) <= areaTolerance);

  if (filtered.length === 0) {
    return { estValue: 0, txnCount: 0, baseValue: 0, minPrice: 0, maxPrice: 0, avgPrice: 0, stdDev: 0 };
  }

  // Basic stats
  const prices = filtered.map(t => t.amount);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // Calculate weights
  const weighted = filtered.map(t => {
    const txnDate = new Date(t.date);
    const daysAgo = Math.floor((now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));

    const recencyWeight = Math.exp(-daysAgo / RECENCY_HALFLIFE);

    let ageWeight = 1.0;
    if (useAgeWeight && targetBuildingYear && t.buildingYear) {
      const yearDiff = Math.abs(t.buildingYear - targetBuildingYear);
      ageWeight = Math.exp(-yearDiff / AGE_HALFLIFE);
    } else if (useAgeWeight) {
      ageWeight = 0.5;
    }

    const combinedWeight = recencyWeight * ageWeight;
    return {
      weight: combinedWeight,
      weightedAmount: t.amount * combinedWeight
    };
  });

  const totalWeight = weighted.reduce((sum, t) => sum + t.weight, 0);
  const totalWeightedAmount = weighted.reduce((sum, t) => sum + t.weightedAmount, 0);
  const baseValue = totalWeightedAmount / totalWeight;

  const floorMultiplier = targetFloor === 1 ? 0.88 : targetFloor === 2 ? 0.95 : 1.0;
  const estValue = baseValue * floorMultiplier;

  return { estValue, txnCount: filtered.length, baseValue, minPrice, maxPrice, avgPrice, stdDev };
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

  console.log('\n' + '═'.repeat(90));
  console.log('📊 IMPACT OF AREA TOLERANCE CHANGE ON EST.VALUE');
  console.log('═'.repeat(90));
  console.log(`\nTarget: ${TARGET.area}㎡, Built ${TARGET.buildingYear}, ${TARGET.floor}층`);
  console.log('Using: Recency Weight + Age Similarity Weight\n');

  console.log('Fetching transactions...');
  const transactions = await fetchTransactions(apiKey, '11140');
  console.log(`✓ Loaded ${transactions.length} 신당동 transactions\n`);

  const tolerances = [2, 3, 4, 5, 6, 7, 8, 10, 15, 20];

  console.log('─'.repeat(90));
  console.log('  Tolerance │ Area Range         │ Txns │ Min    │ Max     │ Avg    │ StdDev │ Est.Value');
  console.log('─'.repeat(90));

  const results: { tolerance: number; estValue: number; txnCount: number }[] = [];

  for (const tol of tolerances) {
    const result = calculateEstValue(
      transactions,
      TARGET.area,
      TARGET.buildingYear,
      TARGET.floor,
      tol,
      true
    );

    results.push({ tolerance: tol, estValue: result.estValue, txnCount: result.txnCount });

    const rangeStr = `${(TARGET.area - tol).toFixed(1)} ~ ${(TARGET.area + tol).toFixed(1)}㎡`;

    console.log(
      `  ±${String(tol).padStart(2)}㎡     │ ${rangeStr.padEnd(18)} │ ${String(result.txnCount).padStart(4)} │ ` +
      `${(result.minPrice/100000000).toFixed(2).padStart(5)}억 │ ${(result.maxPrice/100000000).toFixed(2).padStart(6)}억 │ ` +
      `${(result.avgPrice/100000000).toFixed(2).padStart(5)}억 │ ${(result.stdDev/100000000).toFixed(2).padStart(5)}억 │ ` +
      `${(result.estValue/100000000).toFixed(2)}억`
    );
  }

  // Show delta from ±2㎡ baseline
  console.log('\n' + '─'.repeat(90));
  console.log('CHANGE FROM ±2㎡ BASELINE');
  console.log('─'.repeat(90));

  const baseline = results[0];
  console.log('\n  Tolerance │ Txns Change │ Est.Value Change │ % Change');
  console.log('  ' + '─'.repeat(55));

  for (const r of results) {
    const txnDelta = r.txnCount - baseline.txnCount;
    const valueDelta = r.estValue - baseline.estValue;
    const pctChange = ((r.estValue - baseline.estValue) / baseline.estValue * 100);

    const txnDeltaStr = txnDelta >= 0 ? `+${txnDelta}` : `${txnDelta}`;
    const valueDeltaStr = valueDelta >= 0 ? `+${(valueDelta/100000000).toFixed(2)}억` : `${(valueDelta/100000000).toFixed(2)}억`;
    const pctStr = pctChange >= 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`;

    const marker = r.tolerance === 2 ? ' (baseline)' : '';

    console.log(
      `  ±${String(r.tolerance).padStart(2)}㎡     │ ${txnDeltaStr.padStart(11)} │ ${valueDeltaStr.padStart(16)} │ ${pctStr.padStart(8)}${marker}`
    );
  }

  // Visual chart
  console.log('\n' + '─'.repeat(90));
  console.log('VISUAL: Est.Value by Area Tolerance');
  console.log('─'.repeat(90));

  const maxValue = Math.max(...results.map(r => r.estValue));
  const minValue = Math.min(...results.map(r => r.estValue));
  const range = maxValue - minValue;

  console.log('');
  for (const r of results) {
    const barLength = Math.round(((r.estValue - minValue) / range) * 40) + 5;
    const bar = '█'.repeat(barLength);
    console.log(`  ±${String(r.tolerance).padStart(2)}㎡ │ ${bar} ${(r.estValue/100000000).toFixed(2)}억 (${r.txnCount} txns)`);
  }

  console.log('\n' + '═'.repeat(90));
  console.log('ANALYSIS');
  console.log('═'.repeat(90));
  console.log(`
  Key Observations:

  1. Transaction Count:
     - ±2㎡: ${results[0].txnCount} txns (may be too few for reliable estimate)
     - ±5㎡: ${results.find(r => r.tolerance === 5)?.txnCount} txns (reasonable)
     - ±10㎡: ${results.find(r => r.tolerance === 10)?.txnCount} txns (good coverage)

  2. Est.Value Stability:
     - Larger tolerance = more data = potentially more stable
     - But includes less comparable properties

  3. Recommendation for 연립다세대:
     - Use ±5㎡ as a balance between data quantity and comparability
     - Or use ±10% of target area (for smaller units, tighter range)
`);

  console.log('═'.repeat(90) + '\n');
}

main().catch(console.error);
