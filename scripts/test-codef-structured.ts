/**
 * Test CODEF API with structured address params
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { CodefAPI } from '../lib/apis/codef';

async function test() {
  console.log('\n🔍 Testing CODEF API with structured params\n');

  const api = new CodefAPI();

  // Test with structured params (inquiryType='2')
  const params = {
    addr_sido: '경기도',
    addr_sigungu: '광명시',
    addr_dong: '광명동',
    buildingName: '광명아크포레자이위브',
    dong: '1105',
    ho: '104',
  };

  console.log('Params:', JSON.stringify(params, null, 2));

  const start = Date.now();
  const result = await api.getRegistry(params, '집합건물');

  console.log(`\n⏱️  Duration: ${Date.now() - start}ms`);
  console.log(`✅ Success: ${result.success}`);

  if (result.success && result.data) {
    const entries = result.data.resRegisterEntriesList;
    if (entries?.length > 0) {
      console.log(`\n📄 Document: ${entries[0].resDocTitle}`);
      console.log(`🏠 Property: ${entries[0].resRealty}`);
      console.log(`📑 Sections: ${entries[0].resRegistrationHisList?.map((s: any) => s.resType).join(', ')}`);
    }
  } else {
    console.log(`❌ Error: ${result.error}`);
  }

  // Also test with lot number
  console.log('\n\n--- Testing with lot number ---\n');

  const params2 = {
    addr_sido: '서울특별시',
    addr_sigungu: '강남구',
    addr_dong: '역삼동',
    addr_lotNumber: '649-7',
  };

  console.log('Params:', JSON.stringify(params2, null, 2));

  const start2 = Date.now();
  const result2 = await api.getRegistry(params2, '건물');

  console.log(`\n⏱️  Duration: ${Date.now() - start2}ms`);
  console.log(`✅ Success: ${result2.success}`);

  if (result2.success && result2.data) {
    const entries = result2.data.resRegisterEntriesList;
    if (entries?.length > 0) {
      console.log(`\n📄 Document: ${entries[0].resDocTitle}`);
      console.log(`🏠 Property: ${entries[0].resRealty}`);
    }
  } else {
    console.log(`❌ Error: ${result2.error}`);
  }
}

test().catch(console.error);
