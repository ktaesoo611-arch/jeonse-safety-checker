/**
 * Test MOLIT API for 두산아파트 in 금호동3가 1331
 * Address: 서울특별시 성동구 금호동3가 1331 두산아파트
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.MOLIT_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade';

async function testDusanTransactions() {
  console.log('🧪 Testing MOLIT API for 두산아파트 (Dusan Apartment)\n');
  console.log('='.repeat(80));

  if (!API_KEY) {
    console.error('❌ MOLIT_API_KEY not found in .env.local');
    return;
  }

  console.log('✅ API Key found:', API_KEY.substring(0, 20) + '...\n');

  // Property details
  const property = {
    address: '서울특별시 성동구 금호동3가 1331',
    apartmentName: '두산아파트',
    lawdCd: '11200',  // 성동구 (Seongdong-gu) - first 5 digits
    dongName: '금호동3가',
    bjdongCd: '10900'  // 금호동3가 legal code
  };

  console.log('📍 Property Information:');
  console.log('   - Address:', property.address);
  console.log('   - Apartment:', property.apartmentName);
  console.log('   - LAWD_CD (법정동코드 앞5자리):', property.lawdCd);
  console.log('   - Dong Name:', property.dongName);
  console.log();

  // Fetch last 12 months of transactions
  const today = new Date();
  const monthsToCheck = 12;

  console.log(`📊 Fetching transaction data for last ${monthsToCheck} months...\n`);

  let allTransactions: any[] = [];
  let dusanTransactions: any[] = [];

  for (let i = 0; i < monthsToCheck; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

    try {
      console.log(`🔍 Checking ${yearMonth}...`);

      const response = await axios.get(`${BASE_URL}/getRTMSDataSvcAptTrade`, {
        params: {
          serviceKey: API_KEY,
          pageNo: 1,
          numOfRows: 1000,
          LAWD_CD: property.lawdCd,
          DEAL_YMD: yearMonth
        },
        timeout: 10000
      });

      const result = response.data;
      const items = result.response?.body?.items?.item || [];
      const transactions = Array.isArray(items) ? items : items ? [items] : [];

      console.log(`   ✅ Total transactions in ${yearMonth}: ${transactions.length}`);

      // Filter for 금호동3가 area
      const geumhoTransactions = transactions.filter((t: any) =>
        t.umdNm && t.umdNm.includes('금호')
      );

      if (geumhoTransactions.length > 0) {
        console.log(`   📌 금호동 transactions: ${geumhoTransactions.length}`);

        // Show unique apartment names in this area
        const uniqueNames = [...new Set(geumhoTransactions.map((t: any) => t.aptNm))];
        console.log(`   🏢 Apartments: ${uniqueNames.join(', ')}`);
      }

      // Filter for Dusan apartment specifically
      const dusan = transactions.filter((t: any) =>
        t.aptNm && t.aptNm.includes('두산')
      );

      if (dusan.length > 0) {
        console.log(`   🎯 두산 transactions found: ${dusan.length}`);
        dusanTransactions.push(...dusan);
      }

      allTransactions.push(...transactions);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`   ❌ Error for ${yearMonth}:`, error.message);
      } else {
        console.error(`   ❌ Error for ${yearMonth}:`, error);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary\n');
  console.log(`Total transactions in Seongdong-gu (last ${monthsToCheck} months): ${allTransactions.length}`);
  console.log(`Total 두산 apartment transactions: ${dusanTransactions.length}\n`);

  if (dusanTransactions.length > 0) {
    console.log('✅ 두산아파트 Transactions Found!\n');

    // Group by exact apartment name
    const nameGroups: Record<string, any[]> = {};
    dusanTransactions.forEach(t => {
      const name = t.aptNm?.trim() || 'Unknown';
      if (!nameGroups[name]) {
        nameGroups[name] = [];
      }
      nameGroups[name].push(t);
    });

    console.log('📋 By Apartment Name:');
    Object.entries(nameGroups).forEach(([name, txns]) => {
      console.log(`\n   🏢 ${name}: ${txns.length} transactions`);

      // Show recent 3 transactions
      const recent = txns.slice(0, 3);
      recent.forEach((t, idx) => {
        console.log(`      ${idx + 1}. ${t.dealYear}-${String(t.dealMonth).padStart(2, '0')}-${String(t.dealDay).padStart(2, '0')}`);
        console.log(`         Area: ${t.excluUseAr}㎡, Floor: ${t.floor}, Price: ${t.dealAmount}`);
        console.log(`         Dong: ${t.umdNm}`);
      });
    });

    // Show sample transaction details
    console.log('\n📄 Sample Transaction Data:');
    console.log(JSON.stringify(dusanTransactions[0], null, 2));

  } else {
    console.log('⚠️  No 두산아파트 transactions found in the data\n');
    console.log('💡 Possible reasons:');
    console.log('   1. Apartment name in MOLIT API is different (e.g., "두산", "두산APT", etc.)');
    console.log('   2. No recent transactions in the last 12 months');
    console.log('   3. Data not available for this specific complex');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete!');
}

// Run the test
testDusanTransactions().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
