/**
 * Test script to verify jeonse rights pattern matching
 */

// Sample text from the summary table shown in the user's image
const sampleSummaryText = `
3. (근)저당권 및 전세권 등 ( 을구 )
순위번호 등기목적 접수정보 주요등기사항 대상소유자
8 근저당권설정 2018년9월29일 제54475호 채권최고액 금940,000,000원 근저당권자 무식회사금융회사 전동성
8-2 근저당권변경 2021년10월19일 제170468호 채권최고액 금209,700,000원
8-3 근저당권이전 2022년11월22일 제146245호 근저당권자 한국주택금융공사
18 근저당권설정 2021년3월12일 제43803호 채권최고액 금699,600,000원 근저당권자 무식회사금융회사및별
18-1 근저당권이전 2022년12월22일 제168337호 근저당권자 한국지산런금융사
26 근저당권설정 2021년10월26일 제174333호 채권최고액 금300,000,000원 근저당권자 성민투자금융대부주식회사
26-1 질권 2021년12월19일 제196618호 채권액 금260,000,000원 채권자 아프로파이낸셜대부주식회사
26-1-3 질권이전 2023년12월19일 제179716호 채권자 오케이에프앤에이대부주식회사
26-3 질권 2023년4월7일 제45798호 채권액 금300,000,000원 채권자 황두원
26-4 질권 2023년11월22일 제167290호 채권액 금300,000,000원 채권자 오케이에프앤에이대부주식회사
28 전세권설정 2021년10월27일 제175052호 전세금 금5,000,000원 전세권자 성민투자금융대부주식회사
33 근저당권설정 2022년1월18일 제1804호 채권최고액 금7,500,000원 근저당권자 황경분
`;

console.log('Testing jeonse rights pattern...\n');

// The pattern from the code
const jeonsePattern = /(\d+)\s+전세권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?전세금\s+금\s*([\d,\s]+)원[^금]*?전세권자\s+((?:(?!대상소유자|\d+\s+근저당권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+\s+근저당권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

let match;
let matchCount = 0;

console.log('=== Searching for 전세권설정 ===\n');

while ((match = jeonsePattern.exec(sampleSummaryText)) !== null) {
  matchCount++;
  const [fullMatch, priority, year, month, day, amount, tenant] = match;
  const cleanAmount = parseInt(amount.replace(/,/g, '').replace(/\s+/g, ''));

  console.log(`Match ${matchCount}:`);
  console.log(`  Entry #${priority}`);
  console.log(`  Date: ${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  console.log(`  Amount: ₩${cleanAmount.toLocaleString('ko-KR')}`);
  console.log(`  Tenant: "${tenant.trim()}"`);
  console.log(`  Full match: "${fullMatch}"`);
  console.log('');
}

console.log(`\n✅ Total 전세권 found: ${matchCount}`);

if (matchCount === 0) {
  console.log('\n❌ FAILURE: Pattern did not match');
  console.log('\nTrying simpler pattern to diagnose...');

  // Simpler pattern
  const simplePattern = /(\d+)\s+전세권설정/g;
  let simpleMatch;
  let simpleCount = 0;

  while ((simpleMatch = simplePattern.exec(sampleSummaryText)) !== null) {
    simpleCount++;
    console.log(`  Found: "${simpleMatch[0]}"`);
  }

  console.log(`\nSimple pattern found ${simpleCount} matches`);

  if (simpleCount > 0) {
    console.log('\n🔍 Issue: The date/amount/tenant portion is not matching');
    console.log('Let me show you what comes after "전세권설정":\n');

    const afterPattern = /전세권설정(.{0,200})/;
    const afterMatch = sampleSummaryText.match(afterPattern);
    if (afterMatch) {
      console.log(afterMatch[1]);
    }
  }
} else {
  console.log('\n✅ SUCCESS: Pattern matched correctly!');
}
