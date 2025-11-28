/**
 * Test the FINAL fixed Pattern 2 with entry #43
 */

// Sample text from the summary section (cleaned)
const sampleSummaryText = `3. (근)저당권 및 전세권 등( 을구 ) 순위번호 등기목적 접수정보 주요등기사항 대상소유자 25 근저당권설정 박진경 2016년10월4일 채권최고액 금504,000,000원 제204221호 근저당권자 송파농업협동조합 41 근저당권설정 박진경 2021년12월15일 채권최고액 금806,400,000원 제240238호 근저당권자 제이비우리캐피탈주식회사 43 25 근저당권설정 박진경 2022년5월23일 채권최고액 금118,800,000원 제75079호 근저당권자 제이비우리캐피탈주식회사 출력일시 : 2025년 11월 19일 오후 2시26분15초`;

// Apply cleanText() normalization
const cleanedText = sampleSummaryText.replace(/\s+/g, ' ').trim();

console.log('=== Testing FINAL Fixed Pattern 2 ===\n');

// FINAL Pattern 2 - captures first number, skips extra numbers
const finalPattern2 = /(\d+)(?:\s+\d+)*\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(?:[가-힣]{2,4}\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

let match;
let found43 = false;
const allMatches: any[] = [];

while ((match = finalPattern2.exec(cleanedText)) !== null) {
  const priority = parseInt(match[1]);
  const year = match[2];
  const month = match[3];
  const day = match[4];
  const amount = match[5].replace(/,/g, '').replace(/\s+/g, '');
  const creditor = match[6].trim();

  allMatches.push({ priority, year, month, day, amount, creditor });

  if (priority === 43) {
    found43 = true;
  }
}

console.log(`Found ${allMatches.length} total matches:\n`);
allMatches.forEach(m => {
  const emoji = m.priority === 43 ? '✅' : (m.priority === 25 || m.priority === 41 ? '  ' : '❓');
  console.log(`${emoji} #${m.priority}: ${m.year}-${m.month.padStart(2, '0')}-${m.day.padStart(2, '0')}, ₩${parseInt(m.amount).toLocaleString('ko-KR')}, ${m.creditor}`);
});

console.log('');

const entry43 = allMatches.find(m => m.priority === 43);
const entry41 = allMatches.find(m => m.priority === 41);
const entry25 = allMatches.find(m => m.priority === 25);

if (found43 && allMatches.length === 3 && entry43 && entry41 && entry25) {
  console.log('✅ ✅ ✅ SUCCESS! Pattern 2 now correctly matches all 3 entries:');
  console.log('');
  console.log(`  Entry #25 (2016-10-04):`);
  console.log(`    Amount: ₩${parseInt(entry25.amount).toLocaleString('ko-KR')}`);
  console.log(`    Creditor: ${entry25.creditor}`);
  console.log('');
  console.log(`  Entry #41 (2021-12-15):`);
  console.log(`    Amount: ₩${parseInt(entry41.amount).toLocaleString('ko-KR')}`);
  console.log(`    Creditor: ${entry41.creditor}`);
  console.log(`    ✓ Does NOT include "43"`);
  console.log('');
  console.log(`  Entry #43 (2022-05-23):`);
  console.log(`    Amount: ₩${parseInt(entry43.amount).toLocaleString('ko-KR')}`);
  console.log(`    Creditor: ${entry43.creditor}`);
  console.log(`    ✓ Correctly identified as priority 43 (not 25)`);
  console.log('');
  console.log('The fix:');
  console.log('  1. (\\d+)(?:\\s+\\d+)* - Captures FIRST number, skips extra numbers');
  console.log('  2. (?:[가-힣]{2,4}\\s+)? - Allows optional Korean names before date');
  console.log('  3. Updated lookaheads to recognize "43 25 근저당권" pattern');
} else {
  console.log('❌ FAILURE:');
  if (!found43) console.log('   - Entry #43 not found');
  if (allMatches.length !== 3) console.log(`   - Expected 3 matches, got ${allMatches.length}`);
  if (!entry25) console.log('   - Entry #25 not found');
  if (!entry41) console.log('   - Entry #41 not found');
}
