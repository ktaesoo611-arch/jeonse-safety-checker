/**
 * Test the new formula: Direct rent at reference deposit with BOK rate adjustment
 *
 * Formula:
 * rentAtRef = (txDeposit - userDeposit) × currentRate / 12 + txRent × (currentRate / rateAtTx)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

// BOK Rate History (기준금리)
const BOK_RATE_HISTORY = [
  { effectiveDate: '2023-01-13', baseRate: 3.50 },
  { effectiveDate: '2024-10-11', baseRate: 3.25 },
  { effectiveDate: '2024-11-28', baseRate: 3.00 },
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
 * NEW FORMULA: Calculate rent at reference deposit directly
 */
function calculateRentAtReferenceDeposit(
  txDeposit: number,
  txRent: number,
  txDate: Date,
  userDeposit: number,
  currentRate: number // as decimal, e.g., 0.05 for 5%
): { rentAtRef: number; depositAdj: number; rentAdj: number; bokRate: number; convRate: number } {
  const bokRate = getBOKRateAtDate(txDate);
  const txConvRate = getConversionRate(bokRate) / 100;

  const depositAdjustment = (txDeposit - userDeposit) * currentRate / 12;
  const rentAdjustment = txRent * (currentRate / txConvRate);

  return {
    rentAtRef: depositAdjustment + rentAdjustment,
    depositAdj: depositAdjustment,
    rentAdj: rentAdjustment,
    bokRate,
    convRate: txConvRate * 100
  };
}

/**
 * Theil-Sen Regression for time trend
 */
function theilSenTimeRegression(data: { daysAgo: number; rent: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.rent || 0 };

  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = data[i].daysAgo - data[j].daysAgo; // older - newer (positive if i is older)
      if (Math.abs(dx) > 7) { // At least 1 week difference
        const dy = data[i].rent - data[j].rent;
        slopes.push(dy / dx);
      }
    }
  }

  if (slopes.length === 0) {
    return { slope: 0, intercept: data.reduce((s, d) => s + d.rent, 0) / n };
  }

  slopes.sort((a, b) => a - b);
  const slope = slopes[Math.floor(slopes.length / 2)];

  // Intercept at daysAgo = 0 (today)
  const intercepts = data.map(d => d.rent - slope * d.daysAgo);
  intercepts.sort((a, b) => a - b);
  const intercept = intercepts[Math.floor(intercepts.length / 2)];

  return { slope, intercept };
}

async function testNewFormula() {
  const api = new MolitWolseAPI(process.env.MOLIT_API_KEY!);
  const lawdCd = getDistrictCode('서울특별시', '성동구')!;

  // Test parameters
  const building = '센트라스';
  const targetArea = 84;
  const userDeposit = 200000000; // 2억
  const userRent = 3500000; // 350만원

  // Current BOK rate
  const currentBOKRate = getBOKRateAtDate(new Date());
  const currentConvRate = getConversionRate(currentBOKRate) / 100;

  console.log('='.repeat(70));
  console.log('NEW FORMULA TEST: Rent at Reference Deposit with BOK Rate Adjustment');
  console.log('='.repeat(70));
  console.log(`Building: ${building} ${targetArea}㎡`);
  console.log(`User Deposit: ${(userDeposit / 10000).toLocaleString()}만원`);
  console.log(`User Rent: ${(userRent / 10000).toLocaleString()}만원`);
  console.log(`Current BOK Rate: ${currentBOKRate}% → Conversion Rate: ${(currentConvRate * 100).toFixed(1)}%`);

  // Fetch 12 months of transactions
  const transactions: Array<{
    deposit: number;
    rent: number;
    daysAgo: number;
    date: string;
    area: number;
    floor: number;
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
          date: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
          area: t.exclusiveArea,
          floor: t.floor
        });
      }
    }
  }

  console.log(`\n✅ Found ${transactions.length} transactions for ${building} ~${targetArea}㎡\n`);

  if (transactions.length === 0) {
    console.log('❌ No transactions found. Exiting.');
    return;
  }

  // Sort by date (newest first)
  transactions.sort((a, b) => a.daysAgo - b.daysAgo);

  // ============================================
  // STEP 1: Calculate rent at reference deposit for each transaction
  // ============================================
  console.log('='.repeat(70));
  console.log('STEP 1: Calculate Rent at Reference Deposit (New Formula)');
  console.log('='.repeat(70));
  console.log(`\nFormula: rentAtRef = (txDeposit - userDeposit) × currentRate / 12 + txRent × (currentRate / rateAtTx)\n`);

  console.log('| Date       | Deposit   | Rent    | BOK  | Conv | DepositAdj | RentAdj  | RentAtRef |');
  console.log('|------------|-----------|---------|------|------|------------|----------|-----------|');

  const rentAtRefData: { daysAgo: number; rent: number; date: string }[] = [];

  for (const tx of transactions) {
    const txDate = new Date(now.getTime() - tx.daysAgo * 24 * 60 * 60 * 1000);
    const result = calculateRentAtReferenceDeposit(
      tx.deposit,
      tx.rent,
      txDate,
      userDeposit,
      currentConvRate
    );

    rentAtRefData.push({
      daysAgo: tx.daysAgo,
      rent: result.rentAtRef,
      date: tx.date
    });

    console.log(
      `| ${tx.date} | ${(tx.deposit / 10000).toFixed(0).padStart(7)}만 | ${(tx.rent / 10000).toFixed(0).padStart(5)}만 | ${result.bokRate.toFixed(1)}% | ${result.convRate.toFixed(1)}% | ${(result.depositAdj / 10000).toFixed(1).padStart(10)}만 | ${(result.rentAdj / 10000).toFixed(1).padStart(6)}만 | ${(result.rentAtRef / 10000).toFixed(1).padStart(7)}만 |`
    );
  }

  // ============================================
  // STEP 2: Time regression on rent at reference deposit
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: Time Regression (Theil-Sen)');
  console.log('='.repeat(70));

  const { slope, intercept } = theilSenTimeRegression(rentAtRefData);
  const slopePerMonth = slope * 30;

  console.log(`\nData points: ${rentAtRefData.length}`);
  console.log(`Slope: ${(slopePerMonth / 10000).toFixed(3)}만원/month`);
  console.log(`Intercept (today): ${(intercept / 10000).toFixed(1)}만원`);

  // Expected rent = intercept (at daysAgo = 0)
  const expectedRent = intercept;

  console.log(`\n📊 Expected Rent at ${(userDeposit / 10000).toLocaleString()}만 deposit: ${(expectedRent / 10000).toFixed(1)}만원`);

  // ============================================
  // STEP 3: Compare with user's quote
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: Compare with User Quote');
  console.log('='.repeat(70));

  const difference = userRent - expectedRent;
  const differencePercent = (difference / expectedRent) * 100;

  console.log(`\nUser's Rent:    ${(userRent / 10000).toFixed(1)}만원`);
  console.log(`Expected Rent:  ${(expectedRent / 10000).toFixed(1)}만원`);
  console.log(`Difference:     ${difference >= 0 ? '+' : ''}${(difference / 10000).toFixed(1)}만원 (${differencePercent >= 0 ? '+' : ''}${differencePercent.toFixed(1)}%)`);

  if (differencePercent > 10) {
    console.log(`\n⚠️  Assessment: OVERPRICED - User paying significantly above market`);
  } else if (differencePercent > 0) {
    console.log(`\n✓  Assessment: FAIR - User paying slightly above market`);
  } else if (differencePercent > -10) {
    console.log(`\n✓  Assessment: GOOD DEAL - User paying at or below market`);
  } else {
    console.log(`\n🎉 Assessment: GREAT DEAL - User paying well below market`);
  }

  // ============================================
  // STEP 4: Validation - Compare with simple average
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: Validation');
  console.log('='.repeat(70));

  // Recent 2 months average
  const recent2m = rentAtRefData.filter(d => d.daysAgo <= 60);
  const recent2mAvg = recent2m.reduce((s, d) => s + d.rent, 0) / recent2m.length;

  // All time average
  const allAvg = rentAtRefData.reduce((s, d) => s + d.rent, 0) / rentAtRefData.length;

  console.log(`\n| Metric                     | Value       |`);
  console.log(`|----------------------------|-------------|`);
  console.log(`| Expected (regression)      | ${((expectedRent / 10000).toFixed(1) + '만원').padStart(11)} |`);
  console.log(`| Recent 2mo avg             | ${((recent2mAvg / 10000).toFixed(1) + '만원').padStart(11)} |`);
  console.log(`| All 12mo avg               | ${((allAvg / 10000).toFixed(1) + '만원').padStart(11)} |`);

  console.log(`\n✅ Gap between regression and recent avg: ${Math.abs((expectedRent - recent2mAvg) / 10000).toFixed(1)}만원`);

  // ============================================
  // STEP 5: Visual time series
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 5: Time Series Visualization');
  console.log('='.repeat(70));

  // Group by month
  const monthlyData: Map<string, number[]> = new Map();
  for (const d of rentAtRefData) {
    const monthKey = d.date.substring(0, 7); // YYYY-MM
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
    }
    monthlyData.get(monthKey)!.push(d.rent);
  }

  console.log(`\nMonthly Rent at ${(userDeposit / 10000).toLocaleString()}만 deposit:\n`);

  const sortedMonths = [...monthlyData.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [month, rents] of sortedMonths) {
    const avg = rents.reduce((s, r) => s + r, 0) / rents.length;
    const bar = '█'.repeat(Math.round(avg / 10000 / 5)); // 5만원 per block
    console.log(`${month} | ${bar} ${(avg / 10000).toFixed(0)}만 (n=${rents.length})`);
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`User's rent: ${'█'.repeat(Math.round(userRent / 10000 / 5))} ${(userRent / 10000).toFixed(0)}만 ★`);
  console.log(`Expected:    ${'░'.repeat(Math.round(expectedRent / 10000 / 5))} ${(expectedRent / 10000).toFixed(0)}만`);
}

testNewFormula().catch(console.error);
