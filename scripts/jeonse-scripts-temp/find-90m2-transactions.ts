/**
 * Find exact transactions for 90.62㎡ that match the stored ₩12.8억 valuation
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { MolitAPI } from '../lib/apis/molit';

async function findTransactions() {
  const molit = new MolitAPI(process.env.MOLIT_API_KEY!);

  console.log('🔍 Finding transactions for 청계한신휴플러스 with area ≈90.62㎡\n');

  const transactions = await molit.getRecentTransactionsForApartment(
    '11230',  // 동대문구
    '청계한신휴플러스',
    90.62,    // Target area from PDF
    6         // Last 6 months
  );

  console.log(`Found ${transactions.length} transactions:\n`);

  let total = 0;
  transactions.forEach((t, i) => {
    console.log(`${i + 1}. ${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`);
    console.log(`   Area: ${t.exclusiveArea}㎡, Floor: ${t.floor}층`);
    console.log(`   Amount: ₩${t.transactionAmount.toLocaleString()}`);
    total += t.transactionAmount;
  });

  const avg = total / transactions.length;
  const confidence = Math.min(0.9, 0.5 + (transactions.length * 0.05));

  console.log(`\nCalculation:`);
  console.log(`  Total: ₩${total.toLocaleString()}`);
  console.log(`  Count: ${transactions.length}`);
  console.log(`  Average: ₩${Math.round(avg).toLocaleString()}`);
  console.log(`  Confidence: ${confidence}`);

  console.log(`\nFinal Valuation:`);
  console.log(`  valueMid: ₩${Math.round(avg).toLocaleString()}`);
  console.log(`  In 억: ₩${(Math.round(avg) / 100000000).toFixed(1)}억`);

  console.log(`\n=== Comparison with Stored Value ===`);
  console.log(`  Stored: ₩1,275,000,000 (₩12.8억)`);
  console.log(`  Calculated: ₩${Math.round(avg).toLocaleString()} (₩${(Math.round(avg) / 100000000).toFixed(1)}억)`);
  console.log(`  Match: ${Math.round(avg) === 1275000000 ? '✓ YES' : '✗ NO'}`);
}

findTransactions();
