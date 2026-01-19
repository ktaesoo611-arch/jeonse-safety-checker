/**
 * Compare Est.Value with different area filtering ranges
 *
 * Options:
 *   1. Fixed: ±2㎡ (current)
 *   2. Fixed: ±5㎡
 *   3. Percentage: ±5%
 *   4. Percentage: ±10%
 *   5. Weighted by area similarity (no hard cutoff)
 *
 * Run with: npx tsx scripts/debug-area-range-comparison.ts
 */

import 'dotenv/config';
import axios from 'axios';

interface Transaction {
  date: string;
  amount: number;
  area: number;
  floor: number;
  buildingYear?: number;
  legalDong: string;
}

const RECENCY_HALFLIFE = 60;
const AGE_HALFLIFE = 10;
const AREA_HALFLIFE = 5; // ㎡ for weighted approach

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
          buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined,
          legalDong: '신당동'
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
  areaFilter: { type: 'fixed' | 'percent' | 'weighted'; value: number },
  useAgeWeight: boolean
): { estValue: number; txnCount: number; baseValue: number } {
  const now = new Date();

  // Filter by area
  let filtered: Transaction[];
  if (areaFilter.type === 'fixed') {
    filtered = transactions.filter(t => Math.abs(t.area - targetArea) <= areaFilter.value);
  } else if (areaFilter.type === 'percent') {
    const tolerance = targetArea * (areaFilter.value / 100);
    filtered = transactions.filter(t => Math.abs(t.area - targetArea) <= tolerance);
  } else {
    // Weighted approach - include all, weight by similarity
    filtered = transactions;
  }

  if (filtered.length === 0) {
    return { estValue: 0, txnCount: 0, baseValue: 0 };
  }

  // Calculate weights
  const weighted = filtered.map(t => {
    const txnDate = new Date(t.date);
    const daysAgo = Math.floor((now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));

    // Recency weight
    const recencyWeight = Math.exp(-daysAgo / RECENCY_HALFLIFE);

    // Age weight
    let ageWeight = 0.5;
    if (useAgeWeight && targetBuildingYear && t.buildingYear) {
      const yearDiff = Math.abs(t.buildingYear - targetBuildingYear);
      ageWeight = Math.exp(-yearDiff / AGE_HALFLIFE);
    }

    // Area weight (only for weighted approach)
    let areaWeight = 1.0;
    if (areaFilter.type === 'weighted') {
      const areaDiff = Math.abs(t.area - targetArea);
      areaWeight = Math.exp(-areaDiff / AREA_HALFLIFE);
    }

    const combinedWeight = recencyWeight * ageWeight * areaWeight;
    return {
      ...t,
      weight: combinedWeight,
      weightedAmount: t.amount * combinedWeight
    };
  });

  const totalWeight = weighted.reduce((sum, t) => sum + t.weight, 0);
  const totalWeightedAmount = weighted.reduce((sum, t) => sum + t.weightedAmount, 0);
  const baseValue = totalWeightedAmount / totalWeight;

  // Floor adjustment
  const floorMultiplier = targetFloor === 1 ? 0.88 : targetFloor === 2 ? 0.95 : 1.0;
  const estValue = baseValue * floorMultiplier;

  return { estValue, txnCount: filtered.length, baseValue };
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

  console.log('\n' + '═'.repeat(80));
  console.log('📊 AREA FILTERING RANGE COMPARISON');
  console.log('═'.repeat(80));
  console.log(`\nTarget: ${TARGET.area}㎡, Built ${TARGET.buildingYear}, ${TARGET.floor}층\n`);

  console.log('Fetching transactions...');
  const transactions = await fetchTransactions(apiKey, '11140');
  console.log(`✓ Loaded ${transactions.length} 신당동 transactions\n`);

  // Define filter options
  const filterOptions: { name: string; filter: { type: 'fixed' | 'percent' | 'weighted'; value: number }; range: string }[] = [
    { name: '±2㎡ (current)', filter: { type: 'fixed', value: 2 }, range: `${(TARGET.area - 2).toFixed(1)} ~ ${(TARGET.area + 2).toFixed(1)}㎡` },
    { name: '±5㎡', filter: { type: 'fixed', value: 5 }, range: `${(TARGET.area - 5).toFixed(1)} ~ ${(TARGET.area + 5).toFixed(1)}㎡` },
    { name: '±5%', filter: { type: 'percent', value: 5 }, range: `${(TARGET.area * 0.95).toFixed(1)} ~ ${(TARGET.area * 1.05).toFixed(1)}㎡` },
    { name: '±10%', filter: { type: 'percent', value: 10 }, range: `${(TARGET.area * 0.9).toFixed(1)} ~ ${(TARGET.area * 1.1).toFixed(1)}㎡` },
    { name: 'Weighted (5㎡ half-life)', filter: { type: 'weighted', value: 5 }, range: 'All (weighted by similarity)' },
  ];

  console.log('─'.repeat(80));
  console.log('WITHOUT Age Weighting (recency only)');
  console.log('─'.repeat(80));
  console.log('\n  Filter             │ Range                      │ Txns │ Base Value │ Est.Value');
  console.log('  ' + '─'.repeat(74));

  for (const opt of filterOptions) {
    const result = calculateEstValue(
      transactions,
      TARGET.area,
      TARGET.buildingYear,
      TARGET.floor,
      opt.filter,
      false // No age weight
    );
    console.log(`  ${opt.name.padEnd(18)} │ ${opt.range.padEnd(26)} │ ${String(result.txnCount).padStart(4)} │ ${(result.baseValue/100000000).toFixed(2).padStart(8)}억 │ ${(result.estValue/100000000).toFixed(2)}억`);
  }

  console.log('\n' + '─'.repeat(80));
  console.log('WITH Age Weighting (recency × age similarity)');
  console.log('─'.repeat(80));
  console.log('\n  Filter             │ Range                      │ Txns │ Base Value │ Est.Value');
  console.log('  ' + '─'.repeat(74));

  for (const opt of filterOptions) {
    const result = calculateEstValue(
      transactions,
      TARGET.area,
      TARGET.buildingYear,
      TARGET.floor,
      opt.filter,
      true // With age weight
    );
    console.log(`  ${opt.name.padEnd(18)} │ ${opt.range.padEnd(26)} │ ${String(result.txnCount).padStart(4)} │ ${(result.baseValue/100000000).toFixed(2).padStart(8)}억 │ ${(result.estValue/100000000).toFixed(2)}억`);
  }

  // Show area distribution
  console.log('\n' + '─'.repeat(80));
  console.log('TRANSACTION DISTRIBUTION BY AREA');
  console.log('─'.repeat(80));

  const ranges = [
    { label: '55-58㎡', min: 55, max: 58 },
    { label: '58-60㎡', min: 58, max: 60 },
    { label: '60-62㎡', min: 60, max: 62 },
    { label: '62-64㎡', min: 62, max: 64 },
    { label: '64-67㎡', min: 64, max: 67 },
    { label: '67-70㎡', min: 67, max: 70 },
  ];

  console.log('\n  Range    │ Count │ Avg Price │ Min    │ Max');
  console.log('  ' + '─'.repeat(55));

  for (const r of ranges) {
    const inRange = transactions.filter(t => t.area >= r.min && t.area < r.max);
    if (inRange.length > 0) {
      const avgPrice = inRange.reduce((sum, t) => sum + t.amount, 0) / inRange.length;
      const minPrice = Math.min(...inRange.map(t => t.amount));
      const maxPrice = Math.max(...inRange.map(t => t.amount));
      console.log(`  ${r.label.padEnd(8)} │ ${String(inRange.length).padStart(5)} │ ${(avgPrice/100000000).toFixed(2).padStart(7)}억 │ ${(minPrice/100000000).toFixed(2)}억 │ ${(maxPrice/100000000).toFixed(2)}억`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('RECOMMENDATION');
  console.log('═'.repeat(80));
  console.log(`
  For 연립다세대 with limited data per building:

  1. ±10% area filter (recommended)
     - More transactions = more stable estimate
     - Still reasonably comparable properties

  2. Add area similarity weighting within filter
     - Combined: filter ±10% THEN weight by area similarity
     - Best of both: enough data + proper weighting

  Formula:
    weight = exp(-daysAgo/60) × exp(-|yearDiff|/10) × exp(-|areaDiff|/5)
             ↑ recency         ↑ age similarity    ↑ area similarity
`);

  console.log('═'.repeat(80) + '\n');
}

main().catch(console.error);
