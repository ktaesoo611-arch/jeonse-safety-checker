// Test 텐즈힐 summary format where amount is on a new line

const actualSummary = `3. (근)저당권 및 전세권 등( 을구 )
순위번호 등기목적 접수정보 주요등기사항 대상소유자
19 근저당권설정 2024년3월28일 채권최고액 금933,900,000원
제50959호 근저당권자 농협은행주식회사 강윤지 등`;

// Pattern 2 from deunggibu-parser.ts (amount after keyword)
const pattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing Pattern 2 against 텐즈힐 summary format...\n');
console.log('Summary text:');
console.log(actualSummary);
console.log('\n' + '='.repeat(80) + '\n');

const matches = [];
let match;
while ((match = pattern2.exec(actualSummary)) !== null) {
  matches.push(match);
  const [fullMatch, priority, year, month, day, amount, creditor] = match;
  console.log(`✅ Pattern 2 matched!`);
  console.log(`  Priority: ${priority}`);
  console.log(`  Date: ${year}-${month}-${day}`);
  console.log(`  Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`  Creditor: "${creditor.trim()}"`);
  console.log(`  Full match: "${fullMatch}"`);
}

if (matches.length === 0) {
  console.log('❌ Pattern 2 did NOT match');
  console.log('\nDebugging why...\n');

  // Test step by step
  const step1 = /(\d+)\s+근저당권설정/gs;
  const step2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년/gs;
  const step3 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/gs;
  const step4 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액/gs;
  const step5 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금/gs;
  const step6 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원/gs;
  const step7 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자/gs;

  console.log('Step 1 - Match priority + 근저당권설정:', step1.test(actualSummary) ? '✅' : '❌');
  console.log('Step 2 - Match year:', step2.test(actualSummary) ? '✅' : '❌');
  console.log('Step 3 - Match full date:', step3.test(actualSummary) ? '✅' : '❌');
  console.log('Step 4 - Match to 채권최고액:', step4.test(actualSummary) ? '✅' : '❌');
  console.log('Step 5 - Match to 금:', step5.test(actualSummary) ? '✅' : '❌');
  console.log('Step 6 - Match amount:', step6.test(actualSummary) ? '✅' : '❌');
  console.log('Step 7 - Match to 근저당권자:', step7.test(actualSummary) ? '✅' : '❌');

  // Check what's between date and amount
  const dateMatch = actualSummary.match(/2024년3월28일(.*?)금933,900,000원/s);
  if (dateMatch) {
    console.log(`\nText between date and amount: "${dateMatch[1]}"`);
    console.log(`  Contains newline: ${dateMatch[1].includes('\n')}`);
    console.log(`  Character codes: ${[...dateMatch[1]].map(c => c.charCodeAt(0)).join(', ')}`);
  }

  // Check what's between amount and creditor
  const amountMatch = actualSummary.match(/금933,900,000원(.*?)근저당권자/s);
  if (amountMatch) {
    console.log(`\nText between amount and creditor: "${amountMatch[1]}"`);
    console.log(`  Contains newline: ${amountMatch[1].includes('\n')}`);
    console.log(`  Character codes: ${[...amountMatch[1]].map(c => c.charCodeAt(0)).join(', ')}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n${matches.length === 1 ? '✅ SUCCESS' : '❌ FAILED'}: Expected 1 match, got ${matches.length}`);
