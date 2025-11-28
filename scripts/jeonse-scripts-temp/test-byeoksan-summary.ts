// Test Pattern 2 fix against actual 벽산 summary section text from logs

// This is the exact text from the logs: "📝 Summary section (first 800 chars)"
const actualSummarySection = ` 순위번호 등기목적 접수정보 주요등기사항 11 근저당권설정 2015년 6월3일 제48831호 채권최고액 근저당권자 금275,000,000원 주식회사우리은행 대상소유자 민응호 16 근저당권설정 16-1 근저당권이전 2021년3월22일 채권최고액 금260,000,000원 제64748호 근저당권자 이명원 2023년11월9일 근저당권자 김윤주 제203100호 민응호 민응호 출력일시: 2025년 8월 7일 오전 9시2분57초 1/2 `;

// FIXED Pattern 2 from deunggibu-parser.ts line 150
const pattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing FIXED Pattern 2 against ACTUAL 벽산 summary section...\n');

const matches = [];
let match;
while ((match = pattern2.exec(actualSummarySection)) !== null) {
  matches.push(match);
  const [fullMatch, priority, year, month, day, amount, creditor] = match;
  console.log(`✅ Pattern 2 matched!`);
  console.log(`  Priority: #${priority}`);
  console.log(`  Date: ${year}-${month}-${day}`);
  console.log(`  Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`  Creditor: "${creditor.trim()}"`);
  console.log(`  Full match length: ${fullMatch.length} chars\n`);
}

console.log('='.repeat(80));
console.log(`Result: Found ${matches.length} matches`);
console.log('Expected: 1 match (mortgage #16)\n');

if (matches.length === 0) {
  console.log('❌ FAILED: Pattern 2 did NOT match mortgage #16');
  console.log('\nDEBUGGING:\n');

  // Check if the inline transfer notation is present
  console.log(`Text contains "16 근저당권설정 16-1 근저당권이전": ${actualSummarySection.includes('16 근저당권설정 16-1 근저당권이전')}`);

  // Check step by step what's matching
  const step1 = /16\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?/;
  console.log(`Step 1 - Match "16 근저당권설정 [16-1 근저당권이전]": ${step1.test(actualSummarySection)}`);

  const step2 = /16\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?2021년/;
  console.log(`Step 2 - Match year: ${step2.test(actualSummarySection)}`);

  const step3 = /16\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?2021년3월22일/;
  console.log(`Step 3 - Match full date: ${step3.test(actualSummarySection)}`);

  const step4 = /16\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?2021년3월22일[^금]*?채권최고액/;
  console.log(`Step 4 - Match to 채권최고액: ${step4.test(actualSummarySection)}`);

  const step5 = /16\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?2021년3월22일[^금]*?채권최고액\s+금/;
  console.log(`Step 5 - Match to 금: ${step5.test(actualSummarySection)}`);

  // Check what's between date and 채권최고액
  const betweenMatch = actualSummarySection.match(/2021년3월22일(.*?)채권최고액/s);
  if (betweenMatch) {
    console.log(`\nText between date and 채권최고액: "${betweenMatch[1]}"`);
  }
} else if (matches.length === 1 && matches[0][1] === '16') {
  console.log('✅ SUCCESS: Correctly extracted mortgage #16!');
} else {
  console.log(`⚠️  PARTIAL: Found ${matches.length} matches but expected priority #16`);
}
