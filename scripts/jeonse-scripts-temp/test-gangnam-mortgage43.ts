// Test mortgage #43 from 강남엘에이치1단지 - "박진경 제이비우리캐피탈주식회사"

const summaryText = `순위번호 등기목적 접수정보 주요등기사항 대상소유자
43 근저당권설정 2022년5월23일 채권최고액 금100,000,000원
제92502호 근저당권자 박진경 제이비우리캐피탈주식회사 박진경`;

// Pattern 2 from deunggibu-parser.ts line 150
const pattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing Pattern 2 against 강남 mortgage #43...\n');

const match = pattern2.exec(summaryText);
if (match) {
  const [fullMatch, priority, year, month, day, amount, creditorStr] = match;

  console.log(`✅ Pattern 2 matched mortgage #${priority}`);
  console.log(`  Date: ${year}-${month}-${day}`);
  console.log(`  Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`  Raw creditor: "${creditorStr}"`);
  console.log();

  // Apply the same cleaning as production code (lines 204-230)
  let creditor = creditorStr
    .replace(/제\d+호/g, '') // Remove receipt numbers
    .replace(/\d{6}-\*+/g, '') // Remove ID numbers
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`  After basic cleaning: "${creditor}"`);

  // Remove leading person names (2-4 Korean characters) before corporate creditors
  // UPDATED: Look ahead for corporate keywords anywhere in the string, not just immediately after
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
    const before = creditor;
    // Match 2-4 Korean chars at the start, followed by space, and containing corporate keywords somewhere
    creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
    console.log(`  After leading name removal: "${creditor}" (was "${before}")`);
  }

  // Remove owner names that appear after corporate keywords
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
    creditor = creditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
  }

  // Remove trailing person names (2-4 Korean characters)
  let prevCreditor;
  do {
    prevCreditor = creditor;
    creditor = creditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
  } while (creditor !== prevCreditor && creditor.length > 0);

  console.log(`  Final cleaned creditor: "${creditor}"`);
  console.log();

  if (creditor === '제이비우리캐피탈주식회사') {
    console.log('✅✅ SUCCESS! Creditor correctly extracted as "제이비우리캐피탈주식회사"');
  } else if (creditor.includes('박진경')) {
    console.log(`❌ FAILED! Creditor still contains owner name "박진경": "${creditor}"`);

    console.log('\nDEBUGGING:');
    console.log(`  Does creditor match leading name pattern /^[가-힣]{2,4}\\s+(?=캐피탈)/? ${/^[가-힣]{2,4}\s+(?=캐피탈)/.test(creditor)}`);
    console.log(`  Does "박진경 제이비우리캐피탈주식회사" match? ${/^[가-힣]{2,4}\s+(?=제이비우리캐피탈주식회사)/.test('박진경 제이비우리캐피탈주식회사')}`);
    console.log(`  Does "박진경 제이비우리캐피탈주식회사" contain space? ${('박진경 제이비우리캐피탈주식회사').includes(' ')}`);
  } else {
    console.log(`⚠️  UNEXPECTED: Creditor is "${creditor}" (expected "제이비우리캐피탈주식회사")`);
  }
} else {
  console.log('❌ Pattern 2 did NOT match mortgage #43');
}
