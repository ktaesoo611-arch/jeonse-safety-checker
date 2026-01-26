/**
 * Quick test for CODEF API with custom address
 * Usage: npx tsx scripts/test-codef-quick.ts "서울특별시 강남구 역삼동 649-7"
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { CodefAPI } from '../lib/apis/codef';

const address = process.argv[2] || '서울특별시 강남구 역삼동 649-7';
const type = (process.argv[3] as '건물' | '집합건물' | '토지') || '집합건물';

async function test() {
  console.log(`\n🔍 Testing CODEF API`);
  console.log(`   Address: ${address}`);
  console.log(`   Type: ${type}\n`);

  const api = new CodefAPI();
  const start = Date.now();

  const result = await api.getRegistry(address, type);

  console.log(`⏱️  Duration: ${Date.now() - start}ms`);
  console.log(`✅ Success: ${result.success}`);

  if (result.success && result.data) {
    const entries = result.data.resRegisterEntriesList;
    if (entries?.length > 0) {
      console.log(`\n📄 Document: ${entries[0].resDocTitle}`);
      console.log(`🏠 Property: ${entries[0].resRealty}`);
      console.log(`📑 Sections: ${entries[0].resRegistrationHisList?.map(s => s.resType).join(', ')}`);
    }
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
}

test().catch(console.error);
