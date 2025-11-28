// Test 신림푸르지오 mortgage #17 format issue
// Format: "17 근저당권설정 2021년10월6일 제195969호 금1,172,400,000원 채권최고액 근저당권자 주식회사오에스비저축은행"

const summaryText = `순위번호 등기목적 접수정보 주요등기사항 대상소유자
17 근저당권설정 2021년10월6일 제195969호 금1,172,400,000원 채권최고액 근저당권자 주식회사오에스비저축은행 배미정 등`;

// Pattern 1: expects "채권최고액 ... 근저당권자 ... 금XXX원"
const pattern1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+(?:제\d+호\s+)?근저당권자\s+금\s*([\d,\s]+)원\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

// Pattern 2: expects "채권최고액 금XXX원 ... 근저당권자"
const pattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

// Pattern 3: expects "금XXX원 채권최고액 근저당권자" (NEW!)
const pattern3 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?금\s*([\d,\s]+)원\s+채권최고액\s+근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing 신림푸르지오 mortgage #17...\n');
console.log('Format: "17 근저당권설정 2021년10월6일 제195969호 금1,172,400,000원 채권최고액 근저당권자 주식회사오에스비저축은행"\n');
console.log('This is WEIRD: amount comes BEFORE "채권최고액" keyword!\n');
console.log('='.repeat(80));

console.log('\nTesting Pattern 1 (채권최고액 + 근저당권자 + 금XXX원)...');
const match1 = pattern1.exec(summaryText);
if (match1) {
  console.log('✅ Pattern 1 matched!');
  console.log(`  Priority: #${match1[1]}`);
  console.log(`  Amount: ₩${match1[5]}`);
  console.log(`  Creditor: "${match1[6]}"`);
} else {
  console.log('❌ Pattern 1 did NOT match');
}

console.log('\nTesting Pattern 2 (채권최고액 + 금XXX원 + 근저당권자)...');
const match2 = pattern2.exec(summaryText);
if (match2) {
  console.log('✅ Pattern 2 matched!');
  console.log(`  Priority: #${match2[1]}`);
  console.log(`  Amount: ₩${match2[5]}`);
  console.log(`  Creditor: "${match2[6]}"`);
} else {
  console.log('❌ Pattern 2 did NOT match');
}

console.log('\nTesting Pattern 3 (금XXX원 + 채권최고액 + 근저당권자) [NEW!]...');
const match3 = pattern3.exec(summaryText);
if (match3) {
  console.log('✅✅ Pattern 3 matched!');
  console.log(`  Priority: #${match3[1]}`);
  console.log(`  Date: ${match3[2]}-${match3[3]}-${match3[4]}`);
  console.log(`  Amount: ₩${match3[5].replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`  Raw creditor: "${match3[6]}"`);

  // Apply cleaning
  let creditor = match3[6]
    .replace(/제\d+호/g, '')
    .replace(/\d{6}-\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading names
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
    creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
  }

  // Remove names after keywords
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
    creditor = creditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
  }

  // Remove trailing names
  let prevCreditor;
  do {
    prevCreditor = creditor;
    creditor = creditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
  } while (creditor !== prevCreditor && creditor.length > 0);

  console.log(`  Cleaned creditor: "${creditor}"`);

  if (creditor === '주식회사오에스비저축은행') {
    console.log('\n✅✅✅ SUCCESS! Mortgage #17 correctly extracted!');
  } else {
    console.log(`\n⚠️  Expected "주식회사오에스비저축은행" but got "${creditor}"`);
  }
} else {
  console.log('❌ Pattern 3 did NOT match');
}

console.log('\n' + '='.repeat(80));
console.log('\nDEBUGGING step by step...\n');

// Check basic parts
const step1 = /17\s+근저당권설정\s+2021년10월6일/;
console.log(`Step 1 - Match priority and date: ${step1.test(summaryText) ? '✅' : '❌'}`);

const step2 = /17\s+근저당권설정\s+2021년10월6일\s+제195969호/;
console.log(`Step 2 - Match receipt number: ${step2.test(summaryText) ? '✅' : '❌'}`);

const step3 = /17\s+근저당권설정\s+2021년10월6일\s+제195969호\s+금1,172,400,000원/;
console.log(`Step 3 - Match amount (appears early!): ${step3.test(summaryText) ? '✅' : '❌'}`);

const step4 = /17\s+근저당권설정\s+2021년10월6일\s+제195969호\s+금1,172,400,000원\s+채권최고액/;
console.log(`Step 4 - Match "채권최고액" after amount: ${step4.test(summaryText) ? '✅' : '❌'}`);

const step5 = /17\s+근저당권설정\s+2021년10월6일\s+제195969호\s+금1,172,400,000원\s+채권최고액\s+근저당권자/;
console.log(`Step 5 - Match "근저당권자" after "채권최고액": ${step5.test(summaryText) ? '✅' : '❌'}`);

console.log('\n' + '='.repeat(80));
console.log('\nCONCLUSION:');
console.log('This is a THIRD format where:');
console.log('  Format: "제195969호 금XXX원 채권최고액 근저당권자 ..."');
console.log('  - Receipt number (제195969호) comes first');
console.log('  - Amount (금XXX원) comes BEFORE "채권최고액"');
console.log('  - Then "채권최고액" followed by "근저당권자"');
console.log('  - Then creditor name');
console.log('\nNeed Pattern 3 to match this!');
