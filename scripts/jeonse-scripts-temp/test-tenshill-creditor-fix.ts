// Test Pattern 2 fix to stop before "등" (owner names)

const summarySection = `
순위번호 등기목적 접수정보 주요등기사항 대상소유자
19 근저당권설정 2024년3월28일 채권최고액 금933,900,000원
제50959호 근저당권자 농협은행주식회사 강윤지 등
`;

// FIXED Pattern 2 with "등" stop keyword
const pattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing FIXED Pattern 2 (stops before "등")...\n');

const matches = [];
let match;
while ((match = pattern2.exec(summarySection)) !== null) {
  matches.push(match);
  const [fullMatch, priority, year, month, day, amount, creditor] = match;

  // Apply the same cleaning as production code
  let cleanCreditor = creditor
    .replace(/제\d+호/g, '') // Remove receipt numbers
    .replace(/\d{6}-\*+/g, '') // Remove ID numbers
    .replace(/\s+/g, ' ')
    .trim();

  // Remove owner names that appear after corporate keywords
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융/.test(cleanCreditor)) {
    cleanCreditor = cleanCreditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
  }

  console.log(`✅ Pattern 2 matched!`);
  console.log(`  Priority: #${priority}`);
  console.log(`  Date: ${year}-${month}-${day}`);
  console.log(`  Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`  Raw creditor: "${creditor.trim()}"`);
  console.log(`  Cleaned creditor: "${cleanCreditor}"`);
  console.log(`  Contains "강윤지 등": ${cleanCreditor.includes('강윤지 등') ? '❌ YES (PROBLEM!)' : '✅ NO (GOOD!)'}`);
}

console.log('\n' + '='.repeat(80));
console.log(`Result: Found ${matches.length} matches`);

if (matches.length === 1) {
  let cleanCreditor = matches[0][6]
    .replace(/제\d+호/g, '')
    .replace(/\d{6}-\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Apply the owner name removal logic
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융/.test(cleanCreditor)) {
    cleanCreditor = cleanCreditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
  }

  if (cleanCreditor === '농협은행주식회사') {
    console.log('\n✅✅ SUCCESS! Creditor is correctly extracted as "농협은행주식회사"');
    console.log('   Owner names ("강윤지 등") are NOT included!');
  } else if (cleanCreditor.includes('강윤지')) {
    console.log(`\n❌ FAILED! Creditor still contains owner name: "${cleanCreditor}"`);
  } else {
    console.log(`\n⚠️  UNEXPECTED: Creditor is "${cleanCreditor}"`);
  }
} else {
  console.log(`\n❌ FAILED! Expected 1 match, got ${matches.length}`);
}
