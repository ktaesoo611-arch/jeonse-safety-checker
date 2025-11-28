/**
 * Test MOLIT API for 텐즈힐 apartment
 */

import { MolitAPI, getDistrictCode } from '../lib/apis/molit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.MOLIT_API_KEY;

if (!API_KEY) {
  console.error('❌ MOLIT_API_KEY not found in environment');
  process.exit(1);
}

async function testTenszhill() {
  console.log('🏢 Testing MOLIT API for 텐즈힐');
  console.log('='.repeat(80));

  const molit = new MolitAPI(API_KEY);

  // 성동구 = Seongdong-gu
  const districtCode = getDistrictCode('서울특별시', '성동구');
  console.log(`\n📍 District: 성동구`);
  console.log(`📍 Code: ${districtCode}`);

  if (!districtCode) {
    console.error('❌ District code not found');
    return;
  }

  console.log(`\n🔍 Searching for: 텐즈힐`);
  console.log('='.repeat(80));

  try {
    const transactions = await molit.getRecentTransactionsForApartment(
      districtCode,
      '텐즈힐',
      undefined, // any area
      6 // last 6 months
    );

    console.log(`\n✅ Found ${transactions.length} transactions`);

    if (transactions.length > 0) {
      console.log('\n📊 Recent transactions:');
      transactions.slice(0, 5).forEach(t => {
        console.log(`  ${t.year}-${String(t.month).padStart(2, '0')}: ₩${t.transactionAmount.toLocaleString()} (${t.exclusiveArea}㎡, ${t.floor}F)`);
      });
    } else {
      console.log('\n⚠️  No transactions found for 텐즈힐');
      console.log('\nTrying alternative search strategies...');

      // Try with different name variations
      const variants = ['텐즈힐', 'TENSZHILL', 'Tens Hill'];

      for (const variant of variants) {
        console.log(`\n  Trying: "${variant}"`);
        const result = await molit.getRecentTransactionsForApartment(
          districtCode,
          variant,
          undefined,
          6
        );
        if (result.length > 0) {
          console.log(`    ✓ Found ${result.length} with "${variant}"`);
        } else {
          console.log(`    ✗ No results`);
        }
      }

      // Try getting ALL apartments in 성동구 for multiple months
      console.log(`\n\n🔍 Getting all apartments in 성동구 for last 6 months...`);

      const allApartmentNames = new Set<string>();
      const months = ['202511', '202510', '202509', '202508', '202507', '202506'];

      for (const month of months) {
        const monthTransactions = await molit.getApartmentTransactions(districtCode, month);
        monthTransactions.forEach(t => allApartmentNames.add(t.apartmentName));

        // Check specifically for 텐즈힐
        const tenszhill = monthTransactions.filter(t =>
          t.apartmentName.includes('텐즈') ||
          t.apartmentName.toLowerCase().includes('tens')
        );

        if (tenszhill.length > 0) {
          console.log(`\n⭐️ FOUND in ${month}:`);
          tenszhill.forEach(t => {
            console.log(`  - ${t.apartmentName} (${t.exclusiveArea}㎡, ${t.floor}F, ₩${t.transactionAmount.toLocaleString()})`);
          });
        }
      }

      const sorted = Array.from(allApartmentNames).sort();

      console.log(`\n📋 All apartments with transactions (${allApartmentNames.size} unique):`);
      sorted.forEach((name, idx) => {
        if (name.includes('텐즈') || name.includes('힐') || name.toLowerCase().includes('hill') || name.toLowerCase().includes('tens')) {
          console.log(`  ${idx + 1}. ${name} ⭐️`);
        } else if (idx < 30) {
          console.log(`  ${idx + 1}. ${name}`);
        }
      });
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

testTenszhill();
