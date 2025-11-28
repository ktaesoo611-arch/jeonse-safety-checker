/**
 * Test the complete valuation flow for 두산아파트
 * This tests the fetchPropertyValuation function with the name matching fix
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { MolitAPI, getDistrictCode } from '../lib/apis/molit';
import { getBuildingNameVariants } from '../lib/data/address-data';

dotenv.config({ path: '.env.local' });

async function testDusanValuation() {
  console.log('🧪 Testing Complete Valuation Flow for 두산아파트\n');
  console.log('='.repeat(80));

  const API_KEY = process.env.MOLIT_API_KEY;
  if (!API_KEY) {
    console.error('❌ MOLIT_API_KEY not found');
    return;
  }

  // Property details (same as in the report)
  const property = {
    address: '서울특별시 성동구 금호동3가 1331',
    buildingName: '두산아파트',
    area: 124.98, // Example area from test data
    city: '서울특별시',
    district: '성동구'
  };

  console.log('📍 Property Information:');
  console.log('   - Address:', property.address);
  console.log('   - Building:', property.buildingName);
  console.log('   - Area:', property.area, '㎡');
  console.log();

  // Get district code
  const lawdCd = getDistrictCode(property.city, property.district);
  console.log('📊 District Code:', lawdCd);

  if (!lawdCd) {
    console.error('❌ Could not get district code');
    return;
  }

  // Get building name variants
  const buildingNameVariants = getBuildingNameVariants(property.buildingName);
  console.log('🔤 Building Name Variants:', buildingNameVariants);
  console.log();

  // Initialize MOLIT API
  const molitAPI = new MolitAPI(API_KEY);

  console.log('🔍 Testing each variant...\n');

  let allTransactions: any[] = [];
  let successfulVariant = '';

  // Try each variant
  for (const variant of buildingNameVariants) {
    console.log(`Trying variant: "${variant}"`);

    const transactions = await molitAPI.getRecentTransactionsForApartment(
      lawdCd,
      variant,
      property.area,
      6 // Last 6 months
    );

    console.log(`   → Found ${transactions.length} transactions`);

    if (transactions.length > 0) {
      allTransactions = transactions;
      successfulVariant = variant;
      console.log(`   ✅ SUCCESS with variant: "${variant}"\n`);
      break;
    }
  }

  console.log('='.repeat(80));
  console.log('📊 Valuation Results\n');

  if (allTransactions.length === 0) {
    console.log('❌ No transactions found - would use jeonse ratio fallback');
    console.log('   Formula: estimatedValue = proposedJeonse / 0.70');
    console.log('   Confidence: 0.5');
    return;
  }

  console.log(`✅ Found ${allTransactions.length} transactions using: "${successfulVariant}"`);
  console.log();

  // Calculate valuation (same logic as fetchPropertyValuation)
  const avgPrice = allTransactions.reduce((sum, t) => sum + t.transactionAmount, 0) / allTransactions.length;

  // Determine market trend
  let marketTrend: 'rising' | 'stable' | 'falling' = 'stable';
  if (allTransactions.length >= 3) {
    const recentAvg = allTransactions.slice(0, 3).reduce((sum, t) => sum + t.transactionAmount, 0) / 3;
    const olderAvg = allTransactions.slice(-3).reduce((sum, t) => sum + t.transactionAmount, 0) / 3;

    if (recentAvg > olderAvg * 1.05) marketTrend = 'rising';
    else if (recentAvg < olderAvg * 0.95) marketTrend = 'falling';
  }

  // Confidence based on number of transactions
  const confidence = Math.min(0.9, 0.5 + (allTransactions.length * 0.05));

  console.log('💰 Estimated Market Value:', `₩${(Math.round(avgPrice) / 100000000).toFixed(2)}억`);
  console.log('📈 Market Trend:', marketTrend);
  console.log('🎯 Confidence Score:', confidence.toFixed(2));
  console.log();

  console.log('Display Logic:');
  if (confidence >= 0.6) {
    console.log('✅ WILL SHOW: "Calculated as the average of recent real market transactions from the MOLIT database"');
  } else {
    console.log('⚠️  WILL SHOW: "Estimated based on the proposed jeonse amount using typical jeonse-to-value ratios"');
  }
  console.log();

  // Show recent transactions
  console.log('📋 Recent Transactions (sample):');
  allTransactions.slice(0, 5).forEach((t, i) => {
    const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
    console.log(`   ${i + 1}. ${date}: ₩${(t.transactionAmount / 100000000).toFixed(2)}억 (${t.floor}층, ${t.exclusiveArea}㎡)`);
  });

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Test Complete!');
  console.log();
  console.log('🔧 Next Steps:');
  console.log('   1. Upload the 등기부등본 PDF again to generate a NEW report');
  console.log('   2. The new report will use the transaction-based valuation');
  console.log('   3. You should see "Calculated as the average..." instead of "Estimated based on jeonse ratio"');
}

// Run the test
testDusanValuation().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
