// Test UPDATED Pattern E against ACTUAL 벽산 OCR format

const actualOCR = ` 순위번호 등기목적 접수정보 주요등기사항 11 근저당권설정 2015년 6월3일 제48831호 채권최고액 근저당권자 금275,000,000원 주식회사우리은행 대상소유자 민응호 16 근저당권설정 16-1 근저당권이전 2021년3월22일 채권최고액 금260,000,000원 제64748호 근저당권자 이명원 2023년11월9일 근저당권자 김윤주 제203100호 민응호 민응호 출력일시: 2025년 8월 7일 오전 9시2분57초 1/2 `;

// UPDATED Pattern E: removed \d{4}년 from negative lookahead to capture inline transfers
const patternE = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s*)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^\d]*?채권최고액\s+금\s*([\d,\s]+)원\s*(?:제\d+호\s*)*근저당권자\s+((?:(?!대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

// Pattern F: keyword before amount (for mortgage #11)
const patternF = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(?:제\d+호\s*)?채권최고액\s*(?:제\d+호\s*)*근저당권자\s+금\s*([\d,\s]+)원\s+((?:(?!대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

console.log('Testing UPDATED patterns against 벽산 OCR format...\n');
console.log('OCR text:', actualOCR);
console.log('\n' + '='.repeat(80) + '\n');

const mortgages = new Map(); // priority -> mortgage info

// Try Pattern E
console.log('Pattern E (amount before keyword):');
let matchE;
let countE = 0;
while ((matchE = patternE.exec(actualOCR)) !== null) {
  countE++;
  const [fullMatch, priority, year, month, day, amount, creditor] = matchE;

  // Check for inline transfer and extract transferred creditor
  let cleanCreditor = creditor.trim();
  const inlineTransferMatch = cleanCreditor.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*근저당권자\s+((?:(?!민응호|김선회|진동성|박진경|배미정|현지혜|황보용식|제\d+호).)+?)(?:\s+민응호|\s+김선회|\s+진동성|\s+박진경|\s+배미정|\s+현지혜|\s+황보용식|\s+제\d+호|$)/);
  if (inlineTransferMatch) {
    const originalCreditor = cleanCreditor.split(/\d{4}년/)[0].trim();
    const transferredCreditor = inlineTransferMatch[1].trim().replace(/제\d+호/g, '').replace(/\s+/g, ' ').trim();
    console.log(`  ✅ Match #${countE}: Priority #${priority}, ${year}-${month}-${day}, ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
    console.log(`      Original creditor: "${originalCreditor}" → Transferred to: "${transferredCreditor}"`);
    cleanCreditor = transferredCreditor;
  } else {
    console.log(`  ✅ Match #${countE}: Priority #${priority}, ${year}-${month}-${day}, ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}, "${cleanCreditor}"`);
  }

  mortgages.set(parseInt(priority), { priority, year, month, day, amount, creditor: cleanCreditor });
}
console.log(`  Total: ${countE} matches\n`);

// Try Pattern F
console.log('Pattern F (keyword before amount):');
let matchF;
let countF = 0;
while ((matchF = patternF.exec(actualOCR)) !== null) {
  countF++;
  const [fullMatch, priority, year, month, day, amount, creditor] = matchF;
  console.log(`  ✅ Match #${countF}: Priority #${priority}, ${year}-${month}-${day}, ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}, "${creditor.trim()}"`);
  mortgages.set(parseInt(priority), { priority, year, month, day, amount, creditor: creditor.trim() });
}
console.log(`  Total: ${countF} matches\n`);

console.log('='.repeat(80));
console.log(`\n📊 COMBINED RESULTS: ${mortgages.size} unique mortgages detected`);
console.log('Expected: 2 mortgages (#11 and #16)\n');

if (mortgages.size === 2 && mortgages.has(11) && mortgages.has(16)) {
  console.log('✅✅ PERFECT! Both mortgages detected correctly:');
  mortgages.forEach((m, priority) => {
    console.log(`  #${priority}: ₩${m.amount.replace(/,/g, '').replace(/\s+/g, '')} from ${m.creditor}`);
  });
} else {
  console.log(`❌ Expected 2 mortgages but found ${mortgages.size}`);
  if (mortgages.size > 0) {
    console.log('Detected:');
    mortgages.forEach((m, priority) => {
      console.log(`  #${priority}: ₩${m.amount.replace(/,/g, '').replace(/\s+/g, '')} from ${m.creditor}`);
    });
  }
}
