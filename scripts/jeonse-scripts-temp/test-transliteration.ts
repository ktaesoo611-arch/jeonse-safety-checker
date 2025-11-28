/**
 * Test Korean transliteration utility
 */

import { generateApartmentEnglishName } from '../lib/utils/korean-transliteration';

const testCases = [
  '텐즈힐',
  '텐즈힐(1단지)',
  '텐즈힐(2단지)',
  '개포자이프레지던스',
  '청계한신휴플러스',
  '개봉동아이파크',
  '래미안',
  '자이',
  '푸르지오',
  '힐스테이트',
  'e편한세상',
  '까치마을',
  '마장동엘마파트',
  '개포주공',
  '잠실주공',
  '압구정현대',
  '삼성래미안',
  '헬리오시티',
  '목동신시가지'
];

console.log('🧪 Testing Korean to English transliteration\n');
console.log('='.repeat(80));

testCases.forEach(korean => {
  const english = generateApartmentEnglishName(korean);
  console.log(`Korean:  ${korean.padEnd(25)} → English:  ${english}`);
});

console.log('='.repeat(80));
console.log('\n✅ Transliteration test complete!');
