/**
 * Test MOLIT API specifically for 센트라스 to verify it works
 */

import { config } from 'dotenv';
import { MolitAPI } from '../lib/apis/molit';

config({ path: '.env.local' });

async function testMolitForSentras() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    throw new Error('MOLIT_API_KEY not found');
  }

  const molit = new MolitAPI(apiKey);

  console.log('Testing MOLIT API for 센트라스 in 성동구...\n');

  try {
    // This is what the actual code does
    const transactions = await molit.getRecentTransactionsForApartment(
      '11200',      // 성동구
      '센트라스',
      85,           // Area from example
      6             // Last 6 months
    );

    console.log(`✅ Found ${transactions.length} transactions\n`);

    if (transactions.length > 0) {
      // Calculate average like the actual code does
      const prices = transactions.map(t => t.transactionAmount);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

      console.log('Sample transactions:');
      transactions.slice(0, 5).forEach((t, i) => {
        const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
        console.log(`  ${i + 1}. ${t.apartmentName} - ${t.exclusiveArea}㎡, ${t.floor}층, ₩${(t.transactionAmount / 100000000).toFixed(2)}억 (${date})`);
      });

      console.log(`\n📊 Average Price: ₩${(avgPrice / 100000000).toFixed(2)}억`);
      console.log(`   Estimated Value: ₩${avgPrice.toLocaleString()}`);

      // Check confidence
      const areaMatch = transactions.filter(t => Math.abs(t.exclusiveArea - 85) < 10);
      const confidence = areaMatch.length / transactions.length;
      console.log(`\n✓ Confidence: ${(confidence * 100).toFixed(1)}%`);
      console.log(`   (${areaMatch.length} out of ${transactions.length} transactions match area)`);

    } else {
      console.log('❌ No transactions found!');
      console.log('\nThis means the MOLIT API query is not working.');
      console.log('Possible reasons:');
      console.log('  1. Building name mismatch');
      console.log('  2. District code incorrect');
      console.log('  3. API timeout or rate limiting');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testMolitForSentras();
