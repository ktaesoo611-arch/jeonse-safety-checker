// Test 청계한신휴플러스 mortgage #10 transfer issue
// Format: "10-1 10번근저당권이전 2023년12월14일 ... 근저당권자 주식회사아라에이엠씨대부"
// Expected: Transfer should be detected with optional "10번" prefix

const summaryText = `순위번호 등기목적 접수정보 주요등기사항 대상소유자
10 근저당권설정 2023년5월30일 채권최고액 금19,500,000원
제76144호 근저당권자 주식회사현대부동산연구소 김선회
10-1 10번근저당권이전 2023년12월14일 2023년 12월 14일 근저당권자 주식회사아라에이엠씨대부
제186638호 확정채권양도`;

console.log('Testing 청계한신휴플러스 mortgage #10 transfer...\n');
console.log('Format: "10-1 10번근저당권이전" (with "10번" prefix)\n');
console.log('Expected: Pattern should match and extract "주식회사아라에이엠씨대부"\n');
console.log('='.repeat(80));

// UPDATED transfer pattern with optional \d+번 prefix
const transferPattern = /(\d+)-\d+\s+(?:\d+번)?근저당권이전\s+\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^근]*?근저당권자\s+((?:(?!채무자|제\d+호|대상소유자|[\s\n]+\d+-\d+\s+근저당권|[\s\n]+\d+-\d+\s+질권|[\s\n]+\d+\s+근저당권|[\s\n]+\d+\s+질권|[\s\n]+\d+\s+전세권|[\s\n]+\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+제\d+호|\s+대상소유자|[\s\n]+\d+-\d+\s+근저당권|[\s\n]+\d+-\d+\s+질권|[\s\n]+\d+\s+근저당권|[\s\n]+\d+\s+질권|[\s\n]+\d+\s+전세권|[\s\n]+\d+\s+임차권|출력일시|$)/gs;

console.log('\nTesting UPDATED transfer pattern...');
const match = transferPattern.exec(summaryText);

if (match) {
  const [fullMatch, priorityStr, creditorStr] = match;
  console.log(`✅ Pattern matched transfer for mortgage #${priorityStr}`);
  console.log(`  Full match: "${fullMatch}"`);
  console.log(`  Raw creditor captured: "${creditorStr}"`);
  console.log();

  // Apply cleaning
  let newCreditor = creditorStr
    .replace(/제\d+호/g, '')
    .replace(/\d{6}-\*+/g, '')
    .replace(/[\r\n\s]+\d+-?\d*\s+(근질권|근저당권|질권|전세권|임차권).*$/s, '')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`  After basic cleaning: "${newCreditor}"`);

  // Remove leading names (looped)
  let prevCreditor;
  do {
    prevCreditor = newCreditor;
    if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(newCreditor)) {
      newCreditor = newCreditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
    }
  } while (newCreditor !== prevCreditor && newCreditor.length > 0);

  console.log(`  After leading name removal: "${newCreditor}"`);

  // Remove names after corporate keywords
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(newCreditor)) {
    newCreditor = newCreditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
  }

  console.log(`  After removing names after keywords: "${newCreditor}"`);

  // Remove trailing names (looped)
  do {
    prevCreditor = newCreditor;
    newCreditor = newCreditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
  } while (newCreditor !== prevCreditor && newCreditor.length > 0);

  console.log(`  After trailing name removal: "${newCreditor}"`);
  console.log();

  if (newCreditor === '주식회사아라에이엠씨대부') {
    console.log('✅✅ SUCCESS! Transfer correctly detected and creditor extracted!');
  } else {
    console.log(`❌ FAILED! Expected "주식회사아라에이엠씨대부" but got "${newCreditor}"`);
  }
} else {
  console.log('❌ Pattern did NOT match the transfer');
  console.log('\nDEBUGGING step by step...\n');

  // Test without the "10번" part
  const step1 = /10-1\s+10번근저당권이전/;
  console.log(`Step 1 - Match "10-1 10번근저당권이전": ${step1.test(summaryText) ? '✅' : '❌'}`);

  const step2 = /10-1\s+(?:\d+번)?근저당권이전/;
  console.log(`Step 2 - Match with optional "\\d+번": ${step2.test(summaryText) ? '✅' : '❌'}`);

  const step3 = /10-1\s+(?:\d+번)?근저당권이전\s+2023년12월14일/;
  console.log(`Step 3 - Match with date: ${step3.test(summaryText) ? '✅' : '❌'}`);
}

console.log('\n' + '='.repeat(80));
console.log('\nSOLUTION IMPLEMENTED:');
console.log('Added "(?:\\d+번)?" to the transfer pattern to optionally match formats like:');
console.log('  - "10-1 근저당권이전" (original format)');
console.log('  - "10-1 10번근저당권이전" (numbered format)');
