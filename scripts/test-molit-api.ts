/**
 * Test MOLIT API Connection
 *
 * Run with: npx tsx scripts/test-molit-api.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { MolitAPI, getDistrictCode } from '../lib/apis/molit';

async function testMolitAPI() {
  console.log('🧪 Testing MOLIT API Connection...\n');

  // Check for API key
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: MOLIT_API_KEY not found in environment variables');
    console.log('💡 Make sure you have created .env.local with your API key');
    process.exit(1);
  }

  console.log('✓ API Key found');
  console.log(`✓ Key length: ${apiKey.length} characters\n`);

  const molit = new MolitAPI(apiKey);

  // Test 1: Get district code
  console.log('📍 Test 1: District Code Lookup');
  const districtCode = getDistrictCode('서울', '종로구');
  console.log(`   서울 종로구 → ${districtCode}`);

  if (!districtCode) {
    console.error('❌ District code not found');
    process.exit(1);
  }
  console.log('   ✓ District code resolved\n');

  // Test 2: Fetch recent transactions
  console.log('📊 Test 2: Fetching Recent Transactions');
  console.log('   Location: 종로구');
  console.log('   Period: December 2015 (test data recommended by support center)');

  try {
    const transactions = await molit.getApartmentTransactions(
      districtCode,
      '201512' // December 2015 - recommended test date
    );

    console.log(`   ✓ Received ${transactions.length} transactions\n`);

    if (transactions.length > 0) {
      console.log('📋 Sample Transaction:');
      const sample = transactions[0];
      console.log(`   Apartment: ${sample.apartmentName}`);
      console.log(`   Area: ${sample.exclusiveArea}㎡`);
      console.log(`   Floor: ${sample.floor}`);
      console.log(`   Price: ₩${sample.transactionAmount.toLocaleString()}`);
      console.log(`   Date: ${sample.year}-${sample.month}-${sample.day}\n`);
    }

    // Test 3: Get specific apartment transactions
    if (transactions.length > 0) {
      const targetApartment = transactions[0].apartmentName;
      const targetArea = transactions[0].exclusiveArea;

      console.log('🏢 Test 3: Specific Apartment Search');
      console.log(`   Searching: ${targetApartment}`);
      console.log(`   Area: ${targetArea}㎡`);
      console.log(`   Time range: Last 6 months\n`);

      const specificTransactions = await molit.getRecentTransactionsForApartment(
        districtCode,
        targetApartment,
        targetArea,
        6
      );

      console.log(`   ✓ Found ${specificTransactions.length} matching transactions\n`);

      if (specificTransactions.length > 0) {
        console.log('📈 Price History (most recent first):');
        specificTransactions.slice(0, 5).forEach((t, i) => {
          const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
          console.log(`   ${i + 1}. ${date}: ₩${t.transactionAmount.toLocaleString()} (Floor ${t.floor})`);
        });
      }
    }

    console.log('\n✅ All tests passed!');
    console.log('🎉 MOLIT API is working correctly\n');

  } catch (error: any) {
    console.error('\n❌ API Error:', error.message);

    if (error.message.includes('Failed to fetch')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify API key is correct');
      console.log('   3. Check if data.go.kr API subscription is approved');
      console.log('   4. Try testing with curl command from API-SETUP-WALKTHROUGH.md');
    }

    process.exit(1);
  }
}

// Run the test
testMolitAPI();
