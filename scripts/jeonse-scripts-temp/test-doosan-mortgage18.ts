// Debug why mortgage #18 is not being detected

const summarySection = `순위번호 등기목적 접수정보 주요등기사항 대상소유자
8 근저당권설정 2018년3월29일 채권최고액 금240,000,000원
제54475호 근저당권자 주식회사국민은행 진동성
8-2 근저당권변경 2021년 10월19일 채권최고액 금209,700,000원
제170468호 진동성
8-3 근저당권이전 2022년11월22일 근저당권자 한국주택금융공사
제146245호 진동성
18 근저당권설정 2021년3월12일 채권최고액 금699,600,000원
제43903호 근저당권자 주식회사애큐온캐피탈 진동성
18-1 근저당권이전 2022년 12월29일 근저당권자 한국자산관리공사
제168337호 진동성
26 근저당권설정 2021년 10월26일 채권최고액 금300,000,000원
제174333호 근저당권자 성민투자금융대부주식회사 진동성
33 근저당권설정 2022년 1월6일 채권최고액 금7,500,000원
제1804호 근저당권자 황정문 진동성
출력일시: 2025년 11월 4일 오후 3시55분16초`;

// Pattern 2 from deunggibu-parser.ts
const pattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing Pattern 2 against mortgage #18...\n');

const matches = [];
let match;
while ((match = pattern2.exec(summarySection)) !== null) {
  matches.push(match);
  const [fullMatch, priority, year, month, day, amount, creditor] = match;
  console.log(`✅ Pattern 2 matched priority #${priority}`);
  console.log(`  Date: ${year}-${month}-${day}`);
  console.log(`  Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`  Creditor: "${creditor.trim()}"`);
  console.log();
}

console.log('='.repeat(80));
console.log(`Found ${matches.length} matches`);

if (!matches.find(m => m[1] === '18')) {
  console.log('\n❌ Mortgage #18 NOT FOUND!');
  console.log('\nDEBUGGING...\n');

  // Extract mortgage #18 section
  const mortgage18Text = summarySection.match(/18 근저당권설정.*?(?=18-1)/s);
  if (mortgage18Text) {
    console.log('Mortgage #18 text from summary:');
    console.log('---');
    console.log(mortgage18Text[0]);
    console.log('---\n');

    // Check what's between date and amount
    const dateToAmount = mortgage18Text[0].match(/2021년3월12일(.*?)금699,600,000원/s);
    if (dateToAmount) {
      console.log(`Text between date and amount: "${dateToAmount[1]}"`);
      console.log(`Contains newline: ${dateToAmount[1].includes('\n')}`);
    }

    // Check what's between amount and creditor keyword
    const amountToKeyword = mortgage18Text[0].match(/금699,600,000원(.*?)근저당권자/s);
    if (amountToKeyword) {
      console.log(`Text between amount and "근저당권자": "${amountToKeyword[1]}"`);
      console.log(`Contains newline: ${amountToKeyword[1].includes('\n')}`);
      console.log(`Contains "제43903호": ${amountToKeyword[1].includes('제43903호')}`);
    }

    // Test step by step
    console.log('\nStep-by-step pattern testing:');
    const step1 = /18\s+근저당권설정\s+2021년3월12일/;
    console.log(`  Step 1 - Match date: ${step1.test(summarySection) ? '✅' : '❌'}`);

    const step2 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액/;
    console.log(`  Step 2 - Match to 채권최고액: ${step2.test(summarySection) ? '✅' : '❌'}`);

    const step3 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액\s+금/;
    console.log(`  Step 3 - Match to 금: ${step3.test(summarySection) ? '✅' : '❌'}`);

    const step4 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액\s+금\s*699,600,000원/;
    console.log(`  Step 4 - Match amount: ${step4.test(summarySection) ? '✅' : '❌'}`);

    const step5 = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액\s+금\s*699,600,000원[^근]*?근저당권자/;
    console.log(`  Step 5 - Match to 근저당권자: ${step5.test(summarySection) ? '✅' : '❌'}`);

    // Try extracting with a simpler pattern
    console.log('\nTrying simpler extraction:');
    const simplePattern = /18\s+근저당권설정\s+2021년3월12일[^금]*?채권최고액\s+금\s*([[\d,\s]+)원[^근]*?근저당권자\s+([^\n]+)/;
    const simpleMatch = summarySection.match(simplePattern);
    if (simpleMatch) {
      console.log(`  ✅ Simple pattern works: Amount=₩${simpleMatch[1]}, Creditor="${simpleMatch[2]}"`);
    } else {
      console.log('  ❌ Even simple pattern failed');
    }
  }
} else {
  console.log('\n✅ Mortgage #18 found successfully!');
}
