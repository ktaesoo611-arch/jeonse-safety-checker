/**
 * Trace exactly how ₩862M valuation was calculated
 * Shows which transactions were used and how they were averaged
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { MolitAPI } from '../lib/apis/molit';

async function traceValuation() {
  console.log('🔍 Tracing ₩862M valuation calculation...\n');

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: MOLIT_API_KEY not found');
    process.exit(1);
  }

  const molit = new MolitAPI(apiKey);

  // The parameters that would have been used
  const lawdCd = '11530'; // Guro-gu (구로구)
  const buildingName = '개봉동현대아이파크'; // The correct MOLIT variant
  const area = 84; // Typical area for this apartment

  console.log('Parameters used:');
  console.log('  District Code:', lawdCd, '(구로구)');
  console.log('  Building Name:', buildingName);
  console.log('  Area:', area, '㎡');
  console.log('  Period: Last 6 months from analysis date\n');

  // Fetch transactions (same logic as in route.ts)
  const transactions = await molit.getRecentTransactionsForApartment(
    lawdCd,
    buildingName,
    area,
    6 // monthsBack
  );

  console.log(`\n📊 Found ${transactions.length} transactions\n`);

  if (transactions.length === 0) {
    console.log('⚠️  No transactions found - cannot reproduce ₩862M');
    console.log('This might be from a different time period or building name variant');
    return;
  }

  // Display all transactions
  console.log('=== Transaction Details ===\n');
  let totalAmount = 0;

  transactions.forEach((t, i) => {
    console.log(`${i + 1}. Date: ${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`);
    console.log(`   Building: ${t.apartmentName}`);
    console.log(`   Area: ${t.exclusiveArea}㎡`);
    console.log(`   Floor: ${t.floor}층`);
    console.log(`   Amount: ₩${t.transactionAmount.toLocaleString()}`);
    console.log('');
    totalAmount += t.transactionAmount;
  });

  // Calculate average (same as route.ts line 106)
  const avgPrice = totalAmount / transactions.length;

  console.log('=== Calculation ===');
  console.log(`Total Amount: ₩${totalAmount.toLocaleString()}`);
  console.log(`Number of Transactions: ${transactions.length}`);
  console.log(`Average: ₩${totalAmount.toLocaleString()} ÷ ${transactions.length} = ₩${Math.round(avgPrice).toLocaleString()}`);

  // Calculate confidence (same as route.ts line 119)
  const confidence = Math.min(0.9, 0.5 + (transactions.length * 0.05));
  console.log(`\nConfidence: min(0.9, 0.5 + ${transactions.length} × 0.05) = ${confidence}`);

  // Market trend calculation (same as route.ts lines 109-116)
  let marketTrend: 'rising' | 'stable' | 'falling' = 'stable';
  if (transactions.length >= 3) {
    const recentAvg = transactions.slice(0, 3).reduce((sum, t) => sum + t.transactionAmount, 0) / 3;
    const olderAvg = transactions.slice(-3).reduce((sum, t) => sum + t.transactionAmount, 0) / 3;

    console.log(`\n=== Market Trend ===`);
    console.log(`Recent 3 avg: ₩${Math.round(recentAvg).toLocaleString()}`);
    console.log(`Older 3 avg: ₩${Math.round(olderAvg).toLocaleString()}`);
    console.log(`Ratio: ${(recentAvg / olderAvg).toFixed(3)}`);

    if (recentAvg > olderAvg * 1.05) {
      marketTrend = 'rising';
      console.log(`→ RISING (recent > older × 1.05)`);
    } else if (recentAvg < olderAvg * 0.95) {
      marketTrend = 'falling';
      console.log(`→ FALLING (recent < older × 0.95)`);
    } else {
      console.log(`→ STABLE (within ±5%)`);
    }
  }

  console.log('\n=== Final Valuation ===');
  console.log(`valueMid (Est. Market Value): ₩${Math.round(avgPrice).toLocaleString()}`);
  console.log(`valueLow (95%): ₩${Math.round(avgPrice * 0.95).toLocaleString()}`);
  console.log(`valueHigh (105%): ₩${Math.round(avgPrice * 1.05).toLocaleString()}`);
  console.log(`confidence: ${confidence}`);
  console.log(`marketTrend: ${marketTrend}`);

  console.log('\n✅ This matches the stored valuation if avgPrice ≈ ₩862,608,333');
}

traceValuation();
