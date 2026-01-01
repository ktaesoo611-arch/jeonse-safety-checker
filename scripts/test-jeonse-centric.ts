/**
 * Test Jeonse-Centric Approach
 *
 * 1. Calculate implied jeonse for each transaction: jeonse = deposit + rent × 12 / rate
 * 2. Regress jeonse over time to find today's expected jeonse
 * 3. Calculate expected rent: (jeonse_today - userDeposit) × currentRate / 12
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

// BOK Rate History (기준금리)
// Source: https://www.bok.or.kr/portal/singl/baseRate/list.do
const BOK_RATE_HISTORY = [
  { effectiveDate: '2023-01-13', baseRate: 3.50 },  // Held at 3.50% through early 2024
  { effectiveDate: '2024-10-11', baseRate: 3.25 },  // First cut in cycle
  { effectiveDate: '2024-11-28', baseRate: 3.00 },  // Second cut
  { effectiveDate: '2025-02-25', baseRate: 2.75 },  // Third cut
  { effectiveDate: '2025-05-29', baseRate: 2.50 },  // Fourth cut (current)
];

function getBOKRateAtDate(date: Date): number {
  const sorted = [...BOK_RATE_HISTORY].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  for (const entry of sorted) {
    if (new Date(entry.effectiveDate) <= date) {
      return entry.baseRate;
    }
  }
  return sorted[sorted.length - 1].baseRate;
}

function getConversionRate(bokRate: number): number {
  return bokRate + 2.0; // Legal limit = BOK + 2%
}

/**
 * Step 1: Calculate implied jeonse from a wolse transaction
 * jeonse = deposit + rent × 12 / rate
 *
 * Use CURRENT rate for all transactions to avoid rate-change noise
 */
function getImpliedJeonse(deposit: number, rent: number, currentConvRate: number): number {
  return deposit + rent * 12 / currentConvRate;
}

/**
 * Theil-Sen Regression for time trend
 */
function theilSenTimeRegression(data: { daysAgo: number; value: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.value || 0 };

  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = data[i].daysAgo - data[j].daysAgo; // older - newer
      if (Math.abs(dx) > 7) {
        const dy = data[i].value - data[j].value;
        slopes.push(dy / dx);
      }
    }
  }

  if (slopes.length === 0) {
    return { slope: 0, intercept: data.reduce((s, d) => s + d.value, 0) / n };
  }

  slopes.sort((a, b) => a - b);
  const slope = slopes[Math.floor(slopes.length / 2)];

  // Intercept at daysAgo = 0 (today)
  const intercepts = data.map(d => d.value - slope * d.daysAgo);
  intercepts.sort((a, b) => a - b);
  const intercept = intercepts[Math.floor(intercepts.length / 2)];

  return { slope, intercept };
}

async function testJeonseCentric() {
  const api = new MolitWolseAPI(process.env.MOLIT_API_KEY!);
  const lawdCd = getDistrictCode('서울특별시', '성동구')!;

  // Test parameters
  const building = '센트라스';
  const targetArea = 84;
  const userDeposit = 200000000; // 2억
  const userRent = 3500000; // 350만원

  // Current rate
  const currentBOKRate = getBOKRateAtDate(new Date());
  const currentConvRate = getConversionRate(currentBOKRate) / 100;

  console.log('='.repeat(70));
  console.log('JEONSE-CENTRIC APPROACH TEST');
  console.log('='.repeat(70));
  console.log(`Building: ${building} ${targetArea}㎡`);
  console.log(`User Quote: ${(userDeposit / 10000).toLocaleString()}만원 deposit / ${(userRent / 10000).toLocaleString()}만원 rent`);
  console.log(`Current BOK Rate: ${currentBOKRate}% → Conversion Rate: ${(currentConvRate * 100).toFixed(1)}%`);

  // Fetch transactions
  const transactions: Array<{
    deposit: number;
    rent: number;
    daysAgo: number;
    date: Date;
    dateStr: string;
  }> = [];

  const now = new Date();

  console.log('\n📡 Fetching transactions...');

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const txs = await api.getRentTransactions(lawdCd, yearMonth);

    for (const t of txs) {
      if (t.apartmentName.includes(building) &&
          t.exclusiveArea >= targetArea * 0.9 &&
          t.exclusiveArea <= targetArea * 1.1 &&
          t.monthlyRent > 0) {
        const txDate = new Date(t.year, t.month - 1, t.day);
        const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
        transactions.push({
          deposit: t.deposit,
          rent: t.monthlyRent,
          daysAgo,
          date: txDate,
          dateStr: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
        });
      }
    }
  }

  console.log(`\n✅ Found ${transactions.length} transactions\n`);

  if (transactions.length === 0) {
    console.log('❌ No transactions found. Exiting.');
    return;
  }

  // Sort by date (newest first)
  transactions.sort((a, b) => a.daysAgo - b.daysAgo);

  // ============================================
  // STEP 1: Calculate implied jeonse for each transaction
  // ============================================
  console.log('='.repeat(70));
  console.log('STEP 1: Calculate Implied Jeonse');
  console.log('='.repeat(70));
  console.log(`\nFormula: jeonse = deposit + rent × 12 / rate\n`);

  console.log(`Using CURRENT rate (${(currentConvRate * 100).toFixed(1)}%) for all transactions to avoid rate-change noise\n`);
  console.log('| Date       | Deposit   | Rent    | Implied Jeonse |');
  console.log('|------------|-----------|---------|----------------|');

  const jeonseData: { daysAgo: number; value: number; dateStr: string }[] = [];

  for (const tx of transactions) {
    const impliedJeonse = getImpliedJeonse(tx.deposit, tx.rent, currentConvRate);

    jeonseData.push({
      daysAgo: tx.daysAgo,
      value: impliedJeonse,
      dateStr: tx.dateStr
    });

    console.log(
      `| ${tx.dateStr} | ${(tx.deposit / 10000).toFixed(0).padStart(7)}만 | ${(tx.rent / 10000).toFixed(0).padStart(5)}만 | ${(impliedJeonse / 100000000).toFixed(2).padStart(12)}억 |`
    );
  }

  // ============================================
  // STEP 2: Regress jeonse over time
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: Regress Jeonse Over Time (Theil-Sen)');
  console.log('='.repeat(70));

  const { slope, intercept } = theilSenTimeRegression(jeonseData);
  const slopePerMonth = slope * 30;
  const jeonseToday = intercept;

  console.log(`\nData points: ${jeonseData.length}`);
  console.log(`Slope: ${(slopePerMonth / 100000000).toFixed(4)}억/month`);
  console.log(`Intercept (today's jeonse): ${(jeonseToday / 100000000).toFixed(2)}억`);

  // ============================================
  // STEP 3: Calculate expected rent
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: Calculate Expected Rent');
  console.log('='.repeat(70));

  const expectedRent = (jeonseToday - userDeposit) * currentConvRate / 12;

  console.log(`\nFormula: expectedRent = (jeonse_today - userDeposit) × currentRate / 12`);
  console.log(`\n         expectedRent = (${(jeonseToday / 100000000).toFixed(2)}억 - ${(userDeposit / 100000000).toFixed(1)}억) × ${(currentConvRate * 100).toFixed(1)}% / 12`);
  console.log(`                      = ${((jeonseToday - userDeposit) / 100000000).toFixed(2)}억 × ${(currentConvRate * 100).toFixed(1)}% / 12`);
  console.log(`                      = ${(expectedRent / 10000).toFixed(1)}만원`);

  // ============================================
  // STEP 4: Compare with user's quote
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: Compare with User Quote');
  console.log('='.repeat(70));

  const difference = userRent - expectedRent;
  const differencePercent = (difference / expectedRent) * 100;

  console.log(`\n| Metric          | Value          |`);
  console.log(`|-----------------|----------------|`);
  console.log(`| Today's Jeonse  | ${(jeonseToday / 100000000).toFixed(2).padStart(12)}억 |`);
  console.log(`| User Deposit    | ${(userDeposit / 100000000).toFixed(1).padStart(12)}억 |`);
  console.log(`| Current Rate    | ${(currentConvRate * 100).toFixed(1).padStart(12)}% |`);
  console.log(`| Expected Rent   | ${(expectedRent / 10000).toFixed(1).padStart(10)}만원 |`);
  console.log(`| User's Rent     | ${(userRent / 10000).toFixed(1).padStart(10)}만원 |`);
  console.log(`| Difference      | ${(difference >= 0 ? '+' : '') + (difference / 10000).toFixed(1).padStart(9)}만원 |`);
  console.log(`| Difference %    | ${(differencePercent >= 0 ? '+' : '') + differencePercent.toFixed(1).padStart(11)}% |`);

  if (differencePercent > 10) {
    console.log(`\n⚠️  Assessment: OVERPRICED`);
  } else if (differencePercent > 0) {
    console.log(`\n✓  Assessment: FAIR`);
  } else if (differencePercent > -10) {
    console.log(`\n✓  Assessment: GOOD DEAL`);
  } else {
    console.log(`\n🎉 Assessment: GREAT DEAL`);
  }

  // ============================================
  // STEP 5: Validation
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 5: Validation');
  console.log('='.repeat(70));

  // Recent 2 months jeonse average
  const recent2m = jeonseData.filter(d => d.daysAgo <= 60);
  const recent2mJeonseAvg = recent2m.reduce((s, d) => s + d.value, 0) / recent2m.length;
  const recent2mExpectedRent = (recent2mJeonseAvg - userDeposit) * currentConvRate / 12;

  // All time average
  const allJeonseAvg = jeonseData.reduce((s, d) => s + d.value, 0) / jeonseData.length;
  const allExpectedRent = (allJeonseAvg - userDeposit) * currentConvRate / 12;

  console.log(`\n| Validation Metric        | Jeonse     | → Expected Rent |`);
  console.log(`|--------------------------|------------|-----------------|`);
  console.log(`| Regression (today)       | ${(jeonseToday / 100000000).toFixed(2).padStart(8)}억 | ${(expectedRent / 10000).toFixed(1).padStart(13)}만 |`);
  console.log(`| Recent 2mo avg           | ${(recent2mJeonseAvg / 100000000).toFixed(2).padStart(8)}억 | ${(recent2mExpectedRent / 10000).toFixed(1).padStart(13)}만 |`);
  console.log(`| All 12mo avg             | ${(allJeonseAvg / 100000000).toFixed(2).padStart(8)}억 | ${(allExpectedRent / 10000).toFixed(1).padStart(13)}만 |`);

  console.log(`\n✅ Gap between regression and recent 2mo: ${Math.abs((jeonseToday - recent2mJeonseAvg) / 100000000).toFixed(2)}억`);

  // ============================================
  // STEP 6: Time Series Visualization
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 6: Jeonse Time Series');
  console.log('='.repeat(70));

  // Group by month
  const monthlyData: Map<string, number[]> = new Map();
  for (const d of jeonseData) {
    const monthKey = d.dateStr.substring(0, 7);
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
    }
    monthlyData.get(monthKey)!.push(d.value);
  }

  console.log(`\nImplied Jeonse by Month:\n`);

  const sortedMonths = [...monthlyData.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const minJeonse = Math.min(...jeonseData.map(d => d.value));
  const maxJeonse = Math.max(...jeonseData.map(d => d.value));
  const range = maxJeonse - minJeonse;

  for (const [month, values] of sortedMonths) {
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const barLength = Math.round(((avg - minJeonse) / range) * 30) + 5;
    const bar = '█'.repeat(barLength);
    console.log(`${month} | ${bar} ${(avg / 100000000).toFixed(2)}억 (n=${values.length})`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  const todayBarLength = Math.round(((jeonseToday - minJeonse) / range) * 30) + 5;
  console.log(`Today   | ${'░'.repeat(todayBarLength)} ${(jeonseToday / 100000000).toFixed(2)}억 (regression)`);

  // User's implied jeonse from their quote
  const userImpliedJeonse = userDeposit + userRent * 12 / currentConvRate;
  const userBarLength = Math.round(((userImpliedJeonse - minJeonse) / range) * 30) + 5;
  console.log(`User ★  | ${'█'.repeat(userBarLength)} ${(userImpliedJeonse / 100000000).toFixed(2)}억 (from quote)`);
}

testJeonseCentric().catch(console.error);
