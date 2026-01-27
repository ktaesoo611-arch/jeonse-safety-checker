/**
 * Verify all 마포구 dong codes match between address-parser.ts and address-data.ts
 */
import { parseKoreanAddress } from '../lib/utils/address-parser';

// From address-data.ts (authoritative MOLIT codes)
const ADDRESS_DATA_MAPO = {
  '공덕동': '10100',
  '구수동': '10100',
  '노고산동': '11500',
  '대흥동': '11000',
  '도화동': '10200',
  '동교동': '12100',
  '마포동': '11800',
  '망원동': '10400',
  '상수동': '10500',
  '서교동': '10900',
  '성산동': '10700',
  '신공덕동': '11300',
  '신수동': '11400',
  '신정동': '11900',
  '아현동': '11100',
  '연남동': '10800',
  '염리동': '11200',
  '용강동': '10300',
  '합정동': '10600',
  '현석동': '12000'
};

console.log('=== Verifying 마포구 codes match address-data.ts ===\n');

let mismatches = 0;
for (const [dong, expectedCode] of Object.entries(ADDRESS_DATA_MAPO)) {
  const parsed = parseKoreanAddress(`서울 마포구 ${dong} 1-1`);
  if (parsed) {
    if (parsed.bjdongCd === expectedCode) {
      console.log(`✅ ${dong}: ${parsed.bjdongCd}`);
    } else {
      console.log(`❌ ${dong}: got ${parsed.bjdongCd}, expected ${expectedCode}`);
      mismatches++;
    }
  } else {
    console.log(`❌ ${dong}: PARSE FAILED`);
    mismatches++;
  }
}

if (mismatches === 0) {
  console.log('\n✅ All 마포구 dong codes match!');
} else {
  console.log(`\n❌ Found ${mismatches} mismatches!`);
}
