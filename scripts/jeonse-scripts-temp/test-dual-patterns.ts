/**
 * Test dual pattern extraction (Format A + Format B)
 */

// Sample cleaned text matching the actual OCR output format from the user's PDF
const sampleText = `
3. (근)저당권 및 전세권 등 ( 을구 ) 순위번호 등기목적 접수정보 주요등기사항 2 근저당권설정 2013년8월29일 제29777호 채권최고액 근저당권자 금288,000,000원 중소기업은행 대상소유자 김선회 2-2 근저당권이전 2024년2월2일 제18453호 근저당권자 주식회사아라에이엠씨대부 김선회 4 근저당권설정 2017년6월9일 제40569호 채권최고액 금84,000,000원 근저당권자 중소기업은행 김선회 4-1 근저당권이전 2024년2월2일 근저당권자 주식회사아라에이엠씨대부 김선회 제18453호 5 근저당권설정 2020년9월25일 제214720호 채권최고액 근저당권자 금260,000,000원 김선회 흥국화재해상보험주식회사 6 근저당권설정 2020년 11월 10일 제246682호 채권최고액 근저당권자 금240,000,000원 김선회 비엔케이캐피탈주식회사 7 근저당권설정 2021년2월15일 제28712호 채권최고액 근저당권자 금96,000,000원 비엔케이캐피탈주식회사 8 근저당권설정 2022년4월12일 제52622호 채권최고액 근저당권자 금 120,000,000원 비엔케이캐피탈주식회사 9 근저당권설정 2022년8월16일 제119208호 채권최고액 근저당권자 금106,800,000원 김선회 김선회 김선회 주식회사오케이저축은행 10 근저당권설정 2023년5월30일 제76144호 채권최고액 근저당권자 금19,500,000원 김선회 주식회사현대부동산연구소 10-1 근저당권이전 2023년 12월 14일 근저당권자 제186638호 주식회사아라에이엠씨대부 김선회 [참고사항]
`;

console.log('🧪 Testing Dual Pattern Extraction\n');
console.log('═'.repeat(70));

const summaryMatch = sampleText.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?:4\.|11\s+임차권설정|\[?참\s*고\s*사\s*항\s*\]?|출력일시|$)/s);

if (summaryMatch) {
  const summarySection = summaryMatch[1];

  // Pattern A (채권최고액 근저당권자 금XXX원)
  const patternA = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+제\d+호\s+채권최고액\s+근저당권자\s+금\s*([\d,]+)원\s+((?:김선회\s+)*)(.*?(?:주식회사[\S가-힣]*|[\S가-힣]*(?:은행|저축은행|캐피탈|금융|농협|신협|새마을금고|유한회사|보험|카드|대부|파트너)[\S가-힣]*))/gs;

  // Pattern B (채권최고액 금XXX원 근저당권자)
  const patternB = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+제\d+호\s+채권최고액\s+금\s*([\d,]+)원\s+근저당권자\s+((?:김선회\s+)*)(.*?(?:주식회사[\S가-힣]*|[\S가-힣]*(?:은행|저축은행|캐피탈|금융|농협|신협|새마을금고|유한회사|보험|카드|대부|파트너)[\S가-힣]*))/gs;

  // Track mortgage transfers
  // Format variations:
  // "2-2 근저당권이전 2024년2월2일 제18453호 근저당권자 주식회사아라에이엠씨대부 김선회"
  // "4-1 근저당권이전 2024년2월2일 근저당권자 주식회사아라에이엠씨대부 김선회 제18453호"
  // "10-1 근저당권이전 2023년 12월 14일 근저당권자 제186638호 주식회사아라에이엠씨대부"
  const transferPattern = /(\d+)-\d+\s+근저당권이전\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?근저당권자\s+(?:제\d+호\s+)?(.*?(?:주식회사[\S가-힣]*|[\S가-힣]*(?:은행|저축은행|캐피탈|금융|농협|신협|새마을금고|유한회사|보험|카드|대부|파트너)[\S가-힣]*))/gs;
  const transfers = new Map<number, string>();

  let transferMatch;
  while ((transferMatch = transferPattern.exec(summarySection)) !== null) {
    const [, priority, , , , newCreditor] = transferMatch;
    const cleanCreditor = newCreditor.trim()
      .replace(/김선회/g, '')
      .replace(/제\d+호/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    transfers.set(parseInt(priority), cleanCreditor);
    console.log(`✓ Transfer detected for #${priority}: → ${cleanCreditor}`);
  }

  console.log('\n📊 Extracting mortgages:\n');

  const mortgages: Array<{ priority: number; amount: number; creditor: string; date: string }> = [];

  // Extract with Pattern A
  let matchA;
  while ((matchA = patternA.exec(summarySection)) !== null) {
    const [, priority, year, month, day, amount, ownerNames, creditor] = matchA;
    const priorityNum = parseInt(priority);
    const maxSecuredAmount = parseInt(amount.replace(/,/g, ''));

    let cleanCreditor = creditor.trim()
      .replace(/김선회/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (transfers.has(priorityNum)) {
      cleanCreditor = transfers.get(priorityNum)!;
    }

    mortgages.push({
      priority: priorityNum,
      amount: maxSecuredAmount,
      creditor: cleanCreditor,
      date: `${year}-${month}-${day}`
    });

    console.log(`  ✓ Pattern A - Mortgage #${priorityNum}: ₩${maxSecuredAmount.toLocaleString()} - ${cleanCreditor} (${year}-${month}-${day})`);
  }

  // Extract with Pattern B
  let matchB;
  while ((matchB = patternB.exec(summarySection)) !== null) {
    const [, priority, year, month, day, amount, ownerNames, creditor] = matchB;
    const priorityNum = parseInt(priority);
    const maxSecuredAmount = parseInt(amount.replace(/,/g, ''));

    let cleanCreditor = creditor.trim()
      .replace(/김선회/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (transfers.has(priorityNum)) {
      cleanCreditor = transfers.get(priorityNum)!;
    }

    mortgages.push({
      priority: priorityNum,
      amount: maxSecuredAmount,
      creditor: cleanCreditor,
      date: `${year}-${month}-${day}`
    });

    console.log(`  ✓ Pattern B - Mortgage #${priorityNum}: ₩${maxSecuredAmount.toLocaleString()} - ${cleanCreditor} (${year}-${month}-${day})`);
  }

  // Sort by priority
  mortgages.sort((a, b) => a.priority - b.priority);

  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 FINAL RESULTS:\n');

  mortgages.forEach((m, i) => {
    console.log(`${i + 1}. Priority ${m.priority}: ₩${m.amount.toLocaleString()} - ${m.creditor} (${m.date})`);
  });

  console.log(`\n${mortgages.length === 8 ? '✅' : '❌'} Total: ${mortgages.length} / 8 expected`);

  // Verify expected mortgages
  console.log('\n🎯 VERIFICATION:\n');

  const expected = [
    { priority: 2, creditor: '주식회사아라에이엠씨대부', amount: 288000000 },
    { priority: 4, creditor: '주식회사아라에이엠씨대부', amount: 84000000 },
    { priority: 5, creditor: '흥국화재해상보험주식회사', amount: 260000000 },
    { priority: 6, creditor: '비엔케이캐피탈주식회사', amount: 240000000 },
    { priority: 7, creditor: '비엔케이캐피탈주식회사', amount: 96000000 },
    { priority: 8, creditor: '비엔케이캐피탈주식회사', amount: 120000000 },
    { priority: 9, creditor: '주식회사오케이저축은행', amount: 106800000 },
    { priority: 10, creditor: '주식회사아라에이엠씨대부', amount: 19500000 },
  ];

  expected.forEach(exp => {
    const found = mortgages.find(m => m.priority === exp.priority);
    if (found) {
      const creditorMatch = found.creditor === exp.creditor;
      const amountMatch = found.amount === exp.amount;

      if (creditorMatch && amountMatch) {
        console.log(`  ✅ #${exp.priority}: ${exp.creditor} - ₩${exp.amount.toLocaleString()}`);
      } else {
        console.log(`  ⚠️  #${exp.priority}:`);
        if (!creditorMatch) console.log(`     Expected: ${exp.creditor}`);
        if (!creditorMatch) console.log(`     Got: ${found.creditor}`);
        if (!amountMatch) console.log(`     Amount: Expected ₩${exp.amount.toLocaleString()}, Got ₩${found.amount.toLocaleString()}`);
      }
    } else {
      console.log(`  ❌ #${exp.priority}: NOT FOUND`);
    }
  });

} else {
  console.log('❌ Summary section not found');
}
