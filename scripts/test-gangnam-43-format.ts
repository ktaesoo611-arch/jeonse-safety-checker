/**
 * Test script to understand the exact format of entry #43 after cleanText()
 */

// This is the format from the summary section (from the logs)
// Notice the "25" appearing after "43"
const sampleSummaryText = `3. (근)저당권 및 전세권 등( 을구 ) 순위번호 등기목적 접수정보 주요등기사항 대상소유자 25 근저당권설정 박진경 2016년10월4일 채권최고액 금504,000,000원 제204221호 근저당권자 송파농업협동조합 41 근저당권설정 박진경 2021년12월15일 채권최고액 금806,400,000원 제240238호 근저당권자 제이비우리캐피탈주식회사 43 25 근저당권설정 박진경 2022년5월23일 채권최고액 금118,800,000원 제75079호 근저당권자 제이비우리캐피탈주식회사 출력일시 : 2025년 11월 19일 오후 2시26분15초`;

// Apply cleanText() normalization
const cleanedText = sampleSummaryText.replace(/\s+/g, ' ').trim();

console.log('=== Testing mortgage patterns on entry #43 ===\n');
console.log('Notice: Entry #43 has "25" appearing after it: "43 25 근저당권설정"\n');

// Pattern 3 from the codebase (should be the one matching)
const pattern3 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+\d+(?:-\d+)?\s+근저당권|\s+\d+(?:-\d+)?\s+전세권|\s+대상소유자|$)/gs;

console.log('Testing Pattern 3:\n');

let match;
let found43 = false;
const allMatches: any[] = [];

while ((match = pattern3.exec(cleanedText)) !== null) {
  const priority = parseInt(match[1]);
  allMatches.push({
    priority,
    year: match[2],
    month: match[3],
    day: match[4],
    amount: match[5],
    creditor: match[6],
    fullMatch: match[0]
  });

  if (priority === 43) {
    found43 = true;
  }
}

console.log(`Found ${allMatches.length} total matches:\n`);
allMatches.forEach(m => {
  console.log(`  #${m.priority}: ${m.year}-${m.month}-${m.day}, ₩${m.amount.replace(/\s/g, '')}원, ${m.creditor.trim()}`);
});

if (found43) {
  console.log('\n✅ Pattern 3 successfully matched entry #43!');
} else {
  console.log('\n❌ Pattern 3 did NOT match entry #43');

  // Try to find what's around entry #43
  console.log('\n=== Analyzing entry #43 context ===\n');
  const index = cleanedText.indexOf('43 ');
  if (index !== -1) {
    const context = cleanedText.substring(index, index + 200);
    console.log('Context (200 chars):');
    console.log(context);
    console.log('\n');

    // Try a simpler pattern
    const simplePattern = /43\s+(\d+\s+)?근저당권설정[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+([^\s]+)/;
    const simpleMatch = context.match(simplePattern);

    if (simpleMatch) {
      console.log('✅ Simple pattern matched!');
      console.log('  Amount:', simpleMatch[2]);
      console.log('  Creditor:', simpleMatch[3]);
      console.log('\nThe issue: Pattern 3 expects the date IMMEDIATELY after "근저당권설정"');
      console.log('But entry #43 has "43 25 근저당권설정" - the "25" is in the way!');
    }
  }
}
