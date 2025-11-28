/**
 * Test MOLIT API with recent data
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { MolitAPI } from '../lib/apis/molit';

async function testRecentData() {
  console.log('🧪 Testing MOLIT API with recent data...\n');

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: MOLIT_API_KEY not found');
    process.exit(1);
  }

  const molit = new MolitAPI(apiKey);

  // Try several recent months to find data
  const testCases = [
    { code: '11680', name: '강남구', date: '202411' }, // November 2024
    { code: '11680', name: '강남구', date: '202410' }, // October 2024
    { code: '11680', name: '강남구', date: '202409' }, // September 2024
    { code: '11440', name: '마포구', date: '202410' }, // October 2024
  ];

  for (const test of testCases) {
    console.log(`📊 Testing: ${test.name} (${test.code}) - ${test.date}`);

    try {
      const transactions = await molit.getApartmentTransactions(
        test.code,
        test.date
      );

      console.log(`   ✓ Received ${transactions.length} transactions`);

      if (transactions.length > 0) {
        console.log('\n📋 Sample Transactions:');
        transactions.slice(0, 3).forEach((t, i) => {
          console.log(`   ${i + 1}. ${t.apartmentName} - ${t.exclusiveArea}㎡`);
          console.log(`      ₩${t.transactionAmount.toLocaleString()} (${t.year}-${t.month}-${t.day})`);
        });
        console.log('\n✅ Success! API is returning data\n');
        break;
      } else {
        console.log('   ⚠️  No data for this period\n');
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }
}

testRecentData();
