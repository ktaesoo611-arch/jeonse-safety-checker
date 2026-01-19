/**
 * Debug script to break down Est.Value calculation for 중구 신당동 620 201호
 *
 * Run with: npx ts-node scripts/debug-estvalue-breakdown.ts
 */

import 'dotenv/config';
import { MolitAPI, getDistrictCode } from '../lib/apis/molit';

interface TransactionWithWeight {
  date: string;
  amount: number;
  amountInEok: string;
  area: number;
  floor: number;
  daysAgo: number;
  weight: number;
  weightedAmount: number;
  buildingName?: string;
}

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ MOLIT_API_KEY not set');
    process.exit(1);
  }

  // Property details for 신당동 620 201호
  const property = {
    city: '서울특별시',
    district: '중구',
    dong: '신당동',
    floor: 2, // 201호 = 2층
    // We need to determine the exclusive area - let's fetch all and see what matches
  };

  const lawdCd = getDistrictCode(property.city, property.district);
  console.log('\n' + '='.repeat(70));
  console.log('📊 EST.VALUE BREAKDOWN: 중구 신당동 620 201호');
  console.log('='.repeat(70));
  console.log(`District Code: ${lawdCd}`);
  console.log(`Dong: ${property.dong}`);
  console.log(`Floor: ${property.floor}층`);

  const molitAPI = new MolitAPI(apiKey);

  // Step 1: Fetch all 신당동 multifamily transactions (12 months)
  console.log('\n📥 Step 1: Fetching 신당동 multifamily transactions (12 months)...\n');

  const allTransactions: any[] = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

    try {
      const monthData = await molitAPI.getMultifamilyTransactions(lawdCd!, yearMonth);
      const sindangOnly = monthData.filter(t => t.legalDong === '신당동');
      allTransactions.push(...sindangOnly);
      if (sindangOnly.length > 0) {
        console.log(`   ${yearMonth}: ${sindangOnly.length} 신당동 transactions`);
      }
    } catch (error) {
      console.error(`   ${yearMonth}: Error fetching`);
    }
  }

  console.log(`\n   Total 신당동 transactions: ${allTransactions.length}`);

  // Step 2: Group by area to understand data distribution
  console.log('\n📊 Step 2: Transaction distribution by area:\n');

  const areaGroups: Record<string, any[]> = {};
  allTransactions.forEach(t => {
    const areaKey = t.exclusiveArea.toFixed(1);
    if (!areaGroups[areaKey]) areaGroups[areaKey] = [];
    areaGroups[areaKey].push(t);
  });

  // Sort by transaction count
  const sortedAreas = Object.entries(areaGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15); // Top 15 areas

  console.log('   Area(㎡)  | Count | Price Range (억)');
  console.log('   ' + '-'.repeat(45));

  for (const [area, txns] of sortedAreas) {
    const prices = txns.map(t => t.transactionAmount);
    const minPrice = Math.min(...prices) / 100000000;
    const maxPrice = Math.max(...prices) / 100000000;
    console.log(`   ${area.padStart(8)}㎡ | ${String(txns.length).padStart(5)} | ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}억`);
  }

  // Step 3: Let's analyze assuming a specific area (user needs to confirm)
  // Looking at the 5.6억 transaction mentioned, let's find it
  console.log('\n🔍 Step 3: Finding transactions around ₩5.6억 (Nov 2025):\n');

  const nov2025Txns = allTransactions.filter(t =>
    t.year === 2025 && t.month === 11 &&
    t.transactionAmount >= 500000000 && t.transactionAmount <= 600000000
  );

  if (nov2025Txns.length > 0) {
    console.log('   Found Nov 2025 transactions in 5-6억 range:');
    nov2025Txns.forEach(t => {
      console.log(`   - ${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}: ₩${(t.transactionAmount/100000000).toFixed(2)}억, ${t.exclusiveArea}㎡, ${t.floor}층`);
    });

    // Use this area for calculation
    const targetArea = nov2025Txns[0].exclusiveArea;
    console.log(`\n   → Using area: ${targetArea}㎡ for calculation`);

    // Step 4: Filter transactions by area (±2㎡)
    console.log(`\n📐 Step 4: Filtering by area ${targetArea}㎡ (±2㎡ tolerance):\n`);

    const filteredTxns = allTransactions.filter(t =>
      Math.abs(t.exclusiveArea - targetArea) <= 2
    );

    console.log(`   Matched ${filteredTxns.length} transactions within area tolerance`);

    // Step 5: Calculate weighted average
    console.log('\n⚖️  Step 5: Weighted Average Calculation (60-day half-life):\n');

    const now = new Date();
    const txnsWithWeight: TransactionWithWeight[] = filteredTxns.map(t => {
      const txnDate = new Date(t.year, t.month - 1, t.day);
      const daysAgo = Math.floor((now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
      const weight = Math.exp(-daysAgo / 60); // 60-day half-life

      return {
        date: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
        amount: t.transactionAmount,
        amountInEok: (t.transactionAmount / 100000000).toFixed(2),
        area: t.exclusiveArea,
        floor: t.floor,
        daysAgo,
        weight,
        weightedAmount: t.transactionAmount * weight,
        buildingName: t.apartmentName || '(no name)'
      };
    }).sort((a, b) => a.daysAgo - b.daysAgo); // Sort by recency

    console.log('   Date       | Amount  | Area   | Floor | Days Ago | Weight | Weighted Amt');
    console.log('   ' + '-'.repeat(75));

    txnsWithWeight.forEach(t => {
      console.log(`   ${t.date} | ${t.amountInEok.padStart(5)}억 | ${t.area.toFixed(1).padStart(5)}㎡ | ${String(t.floor).padStart(5)}층 | ${String(t.daysAgo).padStart(8)} | ${t.weight.toFixed(3).padStart(6)} | ${(t.weightedAmount/100000000).toFixed(3)}억`);
    });

    const totalWeightedAmount = txnsWithWeight.reduce((sum, t) => sum + t.weightedAmount, 0);
    const totalWeight = txnsWithWeight.reduce((sum, t) => sum + t.weight, 0);
    const baseValue = totalWeightedAmount / totalWeight;

    console.log('   ' + '-'.repeat(75));
    console.log(`   Total Weighted Amount: ${(totalWeightedAmount/100000000).toFixed(3)}억`);
    console.log(`   Total Weight: ${totalWeight.toFixed(3)}`);
    console.log(`\n   📈 Base Value (Weighted Avg): ₩${(baseValue/100000000).toFixed(2)}억`);

    // Step 6: Apply floor adjustment
    console.log('\n🏢 Step 6: Floor Adjustment:\n');

    const floorMultiplier = 0.95; // 2층 = -5%
    const adjustedValue = baseValue * floorMultiplier;

    console.log(`   Floor: ${property.floor}층`);
    console.log(`   Adjustment: ×${floorMultiplier} (-5% for 2층)`);
    console.log(`\n   📊 Final Est.Value: ₩${(adjustedValue/100000000).toFixed(2)}억`);

    // Step 7: Value range
    console.log('\n📊 Step 7: Value Range:\n');
    console.log(`   Low  (-5%): ₩${(adjustedValue * 0.95 / 100000000).toFixed(2)}억`);
    console.log(`   Mid       : ₩${(adjustedValue / 100000000).toFixed(2)}억`);
    console.log(`   High (+5%): ₩${(adjustedValue * 1.05 / 100000000).toFixed(2)}억`);

  } else {
    console.log('   No Nov 2025 transactions found in 5-6억 range.');
    console.log('   Listing all transactions for manual inspection:');

    allTransactions
      .sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1, a.day);
        const dateB = new Date(b.year, b.month - 1, b.day);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 20)
      .forEach(t => {
        console.log(`   ${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}: ₩${(t.transactionAmount/100000000).toFixed(2)}억, ${t.exclusiveArea}㎡, ${t.floor}층, "${t.apartmentName || '(no name)'}"`);
      });
  }

  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
