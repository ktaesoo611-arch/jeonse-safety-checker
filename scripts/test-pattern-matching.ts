/**
 * Direct pattern matching test
 */

const cleanedText = `3. (근)저당권 및 전세권 등 ( 을구 ) 순위번호 등기목적 접수정보 주요등기사항 대상소유자 2 근저당권설정 2013년8월29일 채권최고액 근저당권자 김선회 제29777호 금288,000,000원 중소기업은행 2-2 근저당권이전 2024년2월2일 근저당권자 주식회사아라에이엠씨대부 김선회 제18453호 4 근저당권설정 2017년6월9일 채권최고액 금84,000,000원 김선회 제40569호 근저당권자 중소기업은행 4-1 근저당권이전 2024년2월2일 근저당권자 주식회사아라에이엠씨대부 김선희 제18453호 5 근저당권설정 2020년9월25일 채권최고액 근저당권자 김선희 제214720호 금260,000,000원 흥국화재해상보험주식회사 6 근저당권설정 2020년11월10일 채권최고액 근저당권자 김선희 제246682호 금240,000,000원 비엔케이캐피탈주식회사 7 근저당권설정 2021년2월15일 채권최고액 근저당권자 김선희 제28712호 금96,000,000원 비엔케이캐피탈주식회사 8 근저당권설정 2022년4월12일 채권최고액 근저당권자 김선희 제52622호 금 120,000,000원 비엔케이캐피탈주식회사 9 근저당권설정 2022년8월16일 채권최고액 근저당권자 김선희 제119208호 금106,800,000원 주식회사오케이저축은행 10 근저당권설정 2023년5월30일 채권최고액 근저당권자 김선희 제76144호 금19,500,000원 주식회사현대부동산연구소 10-1 근저당권이전 2023년12월14일 근저당권자 주식회사아라에이엠씨대부 김선희 제186638호 11 임차권설정 2023년6월7일 임차보증금 금13,000,000원 김선희 제80667호 임차권자 권미리 [ 참 고 사 항 ]`;

const summaryMatch = cleanedText.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?:4\.|11\s+임차권설정|\[?\s*참\s*고\s*사\s*항\s*\]?|출력일시|$)/s);

if (summaryMatch) {
  const summarySection = summaryMatch[1];
  console.log('✅ Found summary section');
  console.log(`Length: ${summarySection.length} chars\n`);

  // Pattern A - with lookahead to stop at next entry
  const patternA = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?채권최고액\s+근저당권자\s+(?:김선회\s+)?(?:제\d+호\s+)?금\s*([\d,]+)원\s+((?:김선회\s+)?(?:주식회사[\S가-힣]+|[\S가-힣]+(?:은행|저축은행|캐피탈|금융|농협|신협|새마을금고|유한회사|보험|카드|대부|파트너)))(?=\s+\d+-?\d*\s+근저당권|\s+\d+\s+임차권|\s+\[)/gs;

  // Pattern B - with lookahead to stop at next entry
  const patternB = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?채권최고액\s+금\s*([\d,]+)원\s+근저당권자\s+((?:김선회\s+)?(?:주식회사[\S가-힣]+|[\S가-힣]+(?:은행|저축은행|캐피탈|금융|농협|신협|새마을금고|유한회사|보험|카드|대부|파트너)))(?=\s+\d+-?\d*\s+근저당권|\s+\d+\s+임차권|\s+\[)/gs;

  console.log('🧪 Testing Pattern A:\n');
  let matchA;
  let countA = 0;
  while ((matchA = patternA.exec(summarySection)) !== null) {
    countA++;
    const [fullMatch, priority, year, month, day, amount, creditor] = matchA;
    const matchEnd = patternA.lastIndex;
    const nextChars = summarySection.substring(matchEnd, matchEnd + 50);
    console.log(`  ${countA}. #${priority}: ₩${parseInt(amount.replace(/,/g, '')).toLocaleString()} - ${creditor}`);
    console.log(`     Full: "${fullMatch}"`);
    console.log(`     Next: "${nextChars}"`);
    console.log('');
  }
  console.log(`Pattern A matches: ${countA}\n`);

  console.log('🧪 Testing Pattern B:\n');
  let matchB;
  let countB = 0;
  while ((matchB = patternB.exec(summarySection)) !== null) {
    countB++;
    const [fullMatch, priority, year, month, day, amount, creditor] = matchB;
    console.log(`  ${countB}. #${priority}: ₩${parseInt(amount.replace(/,/g, '')).toLocaleString()} - ${creditor.substring(0, 50)}`);
    console.log(`     Full: "${fullMatch.substring(0, 150)}..."`);
  }
  console.log(`\nPattern B matches: ${countB}\n`);

  console.log(`Total: ${countA + countB} / 8 expected`);

  // Debug specific entries
  console.log('\n\n🔍 DEBUGGING SPECIFIC ENTRIES:\n');

  const entries = [
    { num: 2, expected: '2 근저당권설정 2013년8월29일 채권최고액 근저당권자 김선회 제29777호 금288,000,000원 중소기업은행' },
    { num: 4, expected: '4 근저당권설정 2017년6월9일 채권최고액 금84,000,000원 김선회 제40569호 근저당권자 중소기업은행' },
    { num: 5, expected: '5 근저당권설정 2020년9월25일 채권최고액 근저당권자 김선희 제214720호 금260,000,000원 흥국화재해상보험주식회사' },
  ];

  entries.forEach(({ num, expected }) => {
    const found = summarySection.includes(expected.substring(0, 50));
    console.log(`Entry #${num}: ${found ? '✅ Found' : '❌ NOT Found'}`);
    if (!found) {
      // Try to find what's actually there
      const pattern = new RegExp(`${num}\\s+근저당권설정.*?(?=${num + 1}\\s+근저당권|${num}-|${num + 1}-|11\\s+임차권|\\[|$)`, 's');
      const actual = summarySection.match(pattern);
      if (actual) {
        console.log(`   Actual: "${actual[0].substring(0, 150)}..."`);
      }
    }
  });
}
