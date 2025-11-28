/**
 * Test script to find what building names MOLIT has for 센트라스
 * Located in: 성동구 (11200) 하왕십리동
 */

import { config } from 'dotenv';
import { MolitAPI } from '../lib/apis/molit';

// Load from .env.local
config({ path: '.env.local' });

async function testSentrasMolitNames() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    throw new Error('MOLIT_API_KEY not found in environment');
  }

  const molit = new MolitAPI(apiKey);

  console.log('🔍 Searching for 센트라스 in 성동구 (11200)...\n');

  const namesToTry = [
    '센트라스',
    '센트라스아파트',
    '센트라스APT',
    '하왕십리센트라스',
    '센트라스1차',
    '센트라스2차',
  ];

  for (const name of namesToTry) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Testing name: "${name}"`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      const transactions = await molit.getRecentTransactionsForApartment(
        '11200',     // 성동구
        name,
        undefined,   // Any area
        3            // Last 3 months
      );

      if (transactions.length > 0) {
        console.log(`\n✅ FOUND ${transactions.length} transactions!`);
        console.log(`\nSample transactions:`);
        transactions.slice(0, 5).forEach((t, idx) => {
          const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
          console.log(`   ${idx + 1}. ${t.apartmentName} - ${t.exclusiveArea}㎡, ${t.floor}층, ₩${(t.transactionAmount / 100000000).toFixed(2)}억 (${date})`);
        });
      } else {
        console.log(`\n❌ No transactions found for "${name}"`);
      }
    } catch (error) {
      console.error(`❌ Error testing "${name}":`, error);
    }

    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Also try to get ALL apartments in the area to see what names exist
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Getting ALL apartments in 성동구 for current month...`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    const today = new Date();
    const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const allTransactions = await molit.getApartmentTransactions('11200', yearMonth);

    console.log(`\nTotal transactions in 성동구 for ${yearMonth}: ${allTransactions.length}`);

    // Find any that contain "센트" or similar
    const sentrasLike = allTransactions.filter(t =>
      t.apartmentName.includes('센트') ||
      t.apartmentName.toLowerCase().includes('cent') ||
      t.apartmentName.toLowerCase().includes('sent')
    );

    if (sentrasLike.length > 0) {
      console.log(`\n🎯 Found ${sentrasLike.length} transactions with names containing "센트"/cent/sent:`);
      const uniqueNames = [...new Set(sentrasLike.map(t => t.apartmentName))];
      uniqueNames.forEach(name => console.log(`   - ${name}`));
    } else {
      console.log(`\n⚠️  No building names containing "센트", "cent", or "sent" found.`);
    }
  } catch (error) {
    console.error('❌ Error getting all transactions:', error);
  }
}

testSentrasMolitNames();
