/**
 * Test script to verify mortgage amendment pattern matching
 * This tests the regex pattern used in deunggibu-parser.ts
 */

// Sample text from the user's document showing amendments
const sampleText = `
10 근저당권설정 2007년7월25일 채권최고액 금390,000,000원 근저당권자 주식회사우리은행
10-3 근저당권변경 박희자 2019년6월13일 채권최고액 금272,510,000원
10-4 근저당권변경 박희자 2022년10월17일 채권최고액 금224,510,000원
21 근저당권설정 2022년10월17일 채권최고액 금840,000,000원 근저당권자 주식회사신한은행
21-1 근저당권변경 2023년4월11일 채권최고액 금900,000,000원
22 근저당권설정 2023년4월11일 채권최고액 금450,000,000원 근저당권자 주식회사신한은행
22-1 근저당권변경 2023년4월11일 채권최고액 금450,000,000원
`;

console.log('Testing mortgage amendment pattern...\n');

// The pattern from the updated code
const amendmentPattern = /(\d+)-(\d+)\s+근저당권변경\s+[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?채권최고액\s+금\s*([\d,\s]+)원/gs;

let match;
let matchCount = 0;

console.log('=== Searching for amendments (근저당권변경) ===\n');

while ((match = amendmentPattern.exec(sampleText)) !== null) {
  matchCount++;
  const [fullMatch, parentStr, subStr, year, month, day, amountStr] = match;
  const parent = parseInt(parentStr);
  const sub = parseInt(subStr);
  const amount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  console.log(`Match ${matchCount}:`);
  console.log(`  Entry: ${parent}-${sub}`);
  console.log(`  Date: ${date}`);
  console.log(`  Amount: ₩${amount.toLocaleString('ko-KR')}`);
  console.log(`  Full match: "${fullMatch.substring(0, 80)}..."`);
  console.log('');
}

console.log(`\n✅ Total amendments found: ${matchCount}`);
console.log('\nExpected results:');
console.log('  - 10-3: ₩272,510,000 (2019-06-13)');
console.log('  - 10-4: ₩224,510,000 (2022-10-17)');
console.log('  - 21-1: ₩900,000,000 (2023-04-11)');
console.log('  - 22-1: ₩450,000,000 (2023-04-11)');

if (matchCount === 4) {
  console.log('\n✅ SUCCESS: Pattern correctly matches all 4 amendments!');
} else {
  console.log(`\n❌ FAILURE: Expected 4 matches, but found ${matchCount}`);
}
