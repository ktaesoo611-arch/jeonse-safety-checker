// Test 두산아파트 summary section to debug two issues:
// 1. Why mortgage #33 includes debtor name "진동성"
// 2. Why mortgage #18 is missing

const actualSummary = `순위번호 등기목적 접수정보 주요등기사항 대상소유자
8 근저당권설정 2011년 6월10일 채권최고액 금173,750,000원
제55841호 근저당권자 한국주택금융공사 민응호
8-2 근저당권변경 2011년 9월28일 채권최고액 금173,750,000원
제92816호
8-3 근저당권변경 2014년 4월28일 채권최고액 금173,750,000원
제52004호
18 근저당권설정 2021년3월12일 채권최고액 금699,600,000원
제43903호 근저당권자 주식회사애큐온캐피탈 민응호
18-1 근저당권이전 2022년 12월29일 근저당권자 한국자산관리공사
제168337호
26 근저당권설정 2022년 1월6일 채권최고액 금250,000,000원
제1802호 근저당권자 성민투자금융대부주식회사 민응호
26-1 근저당권변경 2022년 7월21일 변경후채권최고액 금230,000,000원
제108664호
26-1-3 근저당권변경 2022년 8월16일 변경후채권최고액 금260,000,000원
제119726호
26-3 근저당권변경 2023년 1월27일 변경후채권최고액 금280,000,000원
제11959호
26-4 근저당권변경 2023년 4월26일 변경후채권최고액 금250,000,000원
제61754호
28 전세권설정 2022년 1월7일 존속기간 2022년01월10일부터 2024년01월09일까지
제2011호 전세금 금200,000,000원 전세권자 김선회 민응호
33 근저당권설정 2022년 1월6일 채권최고액 금7,500,000원
제1804호 근저당권자 황정문 진동성 민응호
출력일시: 2025년 8월 7일 오전 9시2분57초`;

// Pattern 2 from deunggibu-parser.ts line 150
const pattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing Pattern 2 against 두산아파트 summary section...\n');

const matches = [];
let match;
while ((match = pattern2.exec(actualSummary)) !== null) {
  matches.push(match);
  const [fullMatch, priority, year, month, day, amount, creditor] = match;

  console.log(`✅ Pattern 2 matched priority #${priority}`);
  console.log(`  Date: ${year}-${month}-${day}`);
  console.log(`  Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`  Raw creditor: "${creditor}"`);

  // Apply the same cleaning as production code
  let cleanCreditor = creditor
    .replace(/제\d+호/g, '') // Remove receipt numbers
    .replace(/\d{6}-\*+/g, '') // Remove ID numbers
    .replace(/\s+/g, ' ')
    .trim();

  // Remove owner names that appear after corporate keywords
  if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(cleanCreditor)) {
    cleanCreditor = cleanCreditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
  }

  // Remove trailing person names (2-4 Korean characters)
  let prevCreditor;
  do {
    prevCreditor = cleanCreditor;
    cleanCreditor = cleanCreditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
  } while (cleanCreditor !== prevCreditor && cleanCreditor.length > 0);

  console.log(`  Cleaned creditor: "${cleanCreditor}"`);
  console.log();
}

console.log('='.repeat(80));
console.log(`\nRESULTS: Found ${matches.length} matches`);
console.log('Expected: 4 mortgages (#8, #18, #26, #33)\n');

// Check which mortgages were found
const foundPriorities = matches.map(m => parseInt(m[1]));
console.log('Found priorities:', foundPriorities.join(', '));

// Check for specific issues
console.log('\n🔍 ISSUE #1: Mortgage #33 creditor');
const mortgage33 = matches.find(m => m[1] === '33');
if (mortgage33) {
  console.log(`  Raw: "${mortgage33[6]}"`);
  console.log(`  Contains "진동성": ${mortgage33[6].includes('진동성') ? '❌ YES (PROBLEM!)' : '✅ NO'}`);
} else {
  console.log('  ⚠️ Mortgage #33 NOT FOUND');
}

console.log('\n🔍 ISSUE #2: Mortgage #18 missing');
const mortgage18 = matches.find(m => m[1] === '18');
if (mortgage18) {
  console.log(`  ✅ FOUND: ${mortgage18[6].trim()}`);
} else {
  console.log('  ❌ NOT FOUND - debugging...\n');

  // Check if the text contains mortgage #18
  console.log('  Summary contains "18 근저당권설정":', actualSummary.includes('18 근저당권설정'));

  // Extract the mortgage #18 section manually
  const mortgage18Section = actualSummary.match(/18 근저당권설정.*?(?=\n18-1)/s);
  if (mortgage18Section) {
    console.log('  \n  Mortgage #18 text:');
    console.log('  ---');
    console.log('  ' + mortgage18Section[0]);
    console.log('  ---\n');

    // Test each part of the pattern
    const step1 = /18\s+근저당권설정\s+2021년/;
    const step2 = /18\s+근저당권설정\s+2021년3월12일/;
    const step3 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액/;
    const step4 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액\s+금/;
    const step5 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액\s+금\s*699,600,000원/;

    console.log('  Step 1 - Match year:', step1.test(actualSummary) ? '✅' : '❌');
    console.log('  Step 2 - Match full date:', step2.test(actualSummary) ? '✅' : '❌');
    console.log('  Step 3 - Match to 채권최고액:', step3.test(actualSummary) ? '✅' : '❌');
    console.log('  Step 4 - Match to 금:', step4.test(actualSummary) ? '✅' : '❌');
    console.log('  Step 5 - Match amount:', step5.test(actualSummary) ? '✅' : '❌');

    // Check what's between date and 채권최고액
    const betweenMatch = actualSummary.match(/2021년3월12일(.*?)채권최고액/s);
    if (betweenMatch) {
      console.log(`  \n  Text between date and 채권최고액: "${betweenMatch[1]}"`);
      console.log(`  Contains newline: ${betweenMatch[1].includes('\n')}`);
    }
  }
}
