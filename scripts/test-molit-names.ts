/**
 * Test script to check what building names MOLIT API returns for 강서구
 * This helps debug the 양지샤인 vs 양지사인 name matching issue
 */

import { config } from 'dotenv';
import { MolitAPI } from '../lib/apis/molit';

// Load from .env.local
config({ path: '.env.local' });

async function testMolitNames() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    throw new Error('MOLIT_API_KEY not found in environment');
  }

  const molit = new MolitAPI(apiKey);

  console.log('🔍 Fetching apartment transactions for 양지샤인아파트...\n');

  try {
    // Use getRecentTransactionsForApartment to test the actual search logic
    const transactions = await molit.getRecentTransactionsForApartment(
      '11500',           // 강서구
      '양지샤인아파트',
      20.37,             // Area from deunggibu
      12                 // Last 12 months
    );

    console.log(`\n📊 Transaction results:\n`);

    if (transactions.length > 0) {
      transactions.forEach((t, idx) => {
        const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
        console.log(`   ${idx + 1}. ${t.apartmentName} - ${t.exclusiveArea}㎡, ${t.floor}층, ₩${(t.transactionAmount / 100000000).toFixed(2)}억 (${date})`);
      });
    } else {
      console.log('   ⚠️  No transactions found!');
      console.log('\n🔍 This means the name/area filtering is not working correctly.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMolitNames();
