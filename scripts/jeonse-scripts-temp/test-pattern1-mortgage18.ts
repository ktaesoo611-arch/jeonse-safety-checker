// Test if updated Pattern 1 matches mortgage #18 format

const summaryText = `18 근저당권설정 2021년3월12일 채권최고액
제43903호 근저당권자 금699,600,000원 진동성
주식회사애큐온캐피탈`;

// UPDATED Pattern 1 with optional receipt number
const pattern1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+(?:제\d+호\s+)?근저당권자\s+금\s*([\d,\s]+)원\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing UPDATED Pattern 1 against mortgage #18 format...\n');

const match = pattern1.exec(summaryText);
if (match) {
  const [fullMatch, priority, year, month, day, amount, creditor] = match;
  console.log('✅✅ SUCCESS! Pattern 1 matched mortgage #18!');
  console.log(`  Priority: #${priority}`);
  console.log(`  Date: ${year}-${month}-${day}`);
  console.log(`  Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`  Raw creditor: "${creditor}"`);

  // Apply cleaning
  let cleanCreditor = creditor
    .replace(/제\d+호/g, '')
    .replace(/\d{6}-\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading person names
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(cleanCreditor)) {
    cleanCreditor = cleanCreditor.replace(/^[가-힣]{2,4}\s+(?=(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
  }

  // Remove names after corporate keywords
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(cleanCreditor)) {
    cleanCreditor = cleanCreditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
  }

  // Remove trailing names
  let prevCreditor;
  do {
    prevCreditor = cleanCreditor;
    cleanCreditor = cleanCreditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
  } while (cleanCreditor !== prevCreditor && cleanCreditor.length > 0);

  console.log(`  Cleaned creditor: "${cleanCreditor}"`);

  if (cleanCreditor === '주식회사애큐온캐피탈') {
    console.log('\n✅✅ PERFECT! Creditor correctly extracted as "주식회사애큐온캐피탈"');
  } else {
    console.log(`\n⚠️  Creditor is "${cleanCreditor}" (expected "주식회사애큐온캐피탈")`);
  }
} else {
  console.log('❌ Pattern 1 did NOT match mortgage #18');
  console.log('\nDEBUGGING...\n');

  // Test step by step
  const step1 = /18\s+근저당권설정\s+2021년3월12일/;
  console.log(`Step 1 - Match date: ${step1.test(summaryText) ? '✅' : '❌'}`);

  const step2 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액/;
  console.log(`Step 2 - Match to 채권최고액: ${step2.test(summaryText) ? '✅' : '❌'}`);

  const step3 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액\s+(?:제\d+호\s+)?근저당권자/;
  console.log(`Step 3 - Match to 근저당권자: ${step3.test(summaryText) ? '✅' : '❌'}`);

  const step4 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액\s+(?:제\d+호\s+)?근저당권자\s+금/;
  console.log(`Step 4 - Match to 금: ${step4.test(summaryText) ? '✅' : '❌'}`);
}
