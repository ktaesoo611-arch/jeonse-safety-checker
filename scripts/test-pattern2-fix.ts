/**
 * Test the fixed Pattern 2 with entry #43
 */

// Sample text from the summary section (cleaned)
const sampleSummaryText = `3. (근)저당권 및 전세권 등( 을구 ) 순위번호 등기목적 접수정보 주요등기사항 대상소유자 25 근저당권설정 박진경 2016년10월4일 채권최고액 금504,000,000원 제204221호 근저당권자 송파농업협동조합 41 근저당권설정 박진경 2021년12월15일 채권최고액 금806,400,000원 제240238호 근저당권자 제이비우리캐피탈주식회사 43 25 근저당권설정 박진경 2022년5월23일 채권최고액 금118,800,000원 제75079호 근저당권자 제이비우리캐피탈주식회사 출력일시 : 2025년 11월 19일 오후 2시26분15초`;

// Apply cleanText() normalization
const cleanedText = sampleSummaryText.replace(/\s+/g, ' ').trim();

console.log('=== Testing Fixed Pattern 2 ===\n');

// FIXED Pattern 2 - now includes (?:[^\d]*?) to handle extra content before the date
const fixedPattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(?:[^\d]*?)(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

let match;
let found43 = false;
const allMatches: any[] = [];

while ((match = fixedPattern2.exec(cleanedText)) !== null) {
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
  const emoji = m.priority === 43 ? '✅' : '  ';
  console.log(`${emoji} #${m.priority}: ${m.year}-${m.month.padStart(2, '0')}-${m.day.padStart(2, '0')}, ₩${parseInt(m.amount).toLocaleString('ko-KR')}, ${m.creditor}`);
});

console.log('');

if (found43) {
  console.log('✅ SUCCESS: Pattern 2 now correctly matches entry #43!');
  console.log('The fix: Added (?:[^\\d]*?) to allow extra content (like "25 박진경") between "근저당권설정" and the date.');
} else {
  console.log('❌ FAILURE: Pattern 2 still did not match entry #43');
}
