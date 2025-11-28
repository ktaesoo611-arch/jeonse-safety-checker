// Test 청계한신휴플러스 mortgage #2 transfer issue
// Problem: capturing "주식회사아라에이엠씨대부 김선회 2-3 근질권 2024년2월2일"
// Expected: "주식회사아라에이엠씨대부"

const summaryText = `순위번호 등기목적 접수정보 주요등기사항 대상소유자
2 근저당권설정 2013년4월9일 제25251호 채권최고액 금288,000,000원 근저당권자 중소기업은행 김선회
2-1 근저당권말소 2024년2월2일 제18452호 김선회
2-2 근저당권이전 2024년2월2일 제18453호 근저당권자 주식회사아라에이엠씨대부 김선회
2-3 근질권 2024년2월2일 제18454호 채권최고액 금288,000,000원 김선회 채권자 통조림가공수산업협동조합`;

console.log('Testing 청계한신휴플러스 mortgage #2 transfer...\n');
console.log('Raw text format:');
console.log('2-2 근저당권이전 2024년2월2일 제18453호 근저당권자 주식회사아라에이엠씨대부 김선회');
console.log('2-3 근질권 2024년2월2일 ...\n');
console.log('Expected: "주식회사아라에이엠씨대부"');
console.log('Problem: Currently capturing "주식회사아라에이엠씨대부 김선회 2-3 근질권 2024년2월2일"\n');
console.log('='.repeat(80));

// UPDATED transfer pattern with [\s\n]+ to match newlines
const transferPattern = /(\d+)-\d+\s+근저당권이전\s+\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^근]*?근저당권자\s+((?:(?!채무자|제\d+호|대상소유자|[\s\n]+\d+-\d+\s+근저당권|[\s\n]+\d+-\d+\s+질권|[\s\n]+\d+\s+근저당권|[\s\n]+\d+\s+질권|[\s\n]+\d+\s+전세권|[\s\n]+\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+제\d+호|\s+대상소유자|[\s\n]+\d+-\d+\s+근저당권|[\s\n]+\d+-\d+\s+질권|[\s\n]+\d+\s+근저당권|[\s\n]+\d+\s+질권|[\s\n]+\d+\s+전세권|[\s\n]+\d+\s+임차권|출력일시|$)/gs;

console.log('\nTesting current transfer pattern...');
const match = transferPattern.exec(summaryText);

if (match) {
  const [fullMatch, priorityStr, creditorStr] = match;
  console.log(`✅ Pattern matched mortgage #${priorityStr}`);
  console.log(`  Full match: "${fullMatch}"`);
  console.log(`  Raw creditor captured: "${creditorStr}"`);
  console.log();

  // Apply cleaning
  let cleanCreditor = creditorStr
    .replace(/제\d+호/g, '')
    .replace(/\d{6}-\*+/g, '')
    // Remove everything from a newline+number pattern onwards
    .replace(/[\r\n]+\d+.*$/s, '')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`  After basic cleaning (including newline removal): "${cleanCreditor}"`);

  // Remove leading names (looped)
  let prevCreditor;
  do {
    prevCreditor = cleanCreditor;
    if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(cleanCreditor)) {
      cleanCreditor = cleanCreditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
    }
  } while (cleanCreditor !== prevCreditor && cleanCreditor.length > 0);

  console.log(`  After leading name removal: "${cleanCreditor}"`);

  // Remove names after corporate keywords
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(cleanCreditor)) {
    cleanCreditor = cleanCreditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
  }

  console.log(`  After removing names after keywords: "${cleanCreditor}"`);

  // Remove trailing names (looped)
  do {
    prevCreditor = cleanCreditor;
    cleanCreditor = cleanCreditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
  } while (cleanCreditor !== prevCreditor && cleanCreditor.length > 0);

  console.log(`  After trailing name removal: "${cleanCreditor}"`);
  console.log();

  if (cleanCreditor === '주식회사아라에이엠씨대부') {
    console.log('✅✅ SUCCESS! Creditor correctly extracted!');
  } else {
    console.log(`❌ FAILED! Expected "주식회사아라에이엠씨대부" but got "${cleanCreditor}"`);

    if (cleanCreditor.includes('2-3')) {
      console.log('\n⚠️  The pattern is capturing the next line "2-3 근질권"!');
      console.log('   The stop keyword "\\d+-\\d+\\s+근질권" should have prevented this.');
      console.log('   Checking if the lookahead is working...\n');

      // Debug: Check what the pattern sees
      const debugText = '근저당권자 주식회사아라에이엠씨대부 김선회\n2-3 근질권';
      console.log(`   Testing lookahead on: "${debugText}"`);
      const lookahead = /(?=\s+\d+-\d+\s+근질권)/;
      const testMatch = debugText.match(/근저당권자\s+((?:(?!\d+-\d+\s+근질권).)+?)(?=\s+\d+-\d+\s+근질권|$)/s);
      console.log(`   Should stop before "2-3": ${testMatch ? testMatch[1] : 'NO MATCH'}`);
    }
  }
} else {
  console.log('❌ Pattern did NOT match the transfer');
}

console.log('\n' + '='.repeat(80));
console.log('\nSOLUTION IDEAS:');
console.log('1. The negative lookahead needs "\\s+" before "\\d+-\\d+" to match whitespace');
console.log('2. OR we need to add "\\d+-\\d+" as a simpler stop pattern');
console.log('3. The capture group should stop at ANY line that starts with a number pattern');
