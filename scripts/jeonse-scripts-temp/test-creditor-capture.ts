// Debug Pattern E creditor capture for mortgage #16

const actualOCR = ` 순위번호 등기목적 접수정보 주요등기사항 11 근저당권설정 2015년 6월3일 제48831호 채권최고액 근저당권자 금275,000,000원 주식회사우리은행 대상소유자 민응호 16 근저당권설정 16-1 근저당권이전 2021년3월22일 채권최고액 금260,000,000원 제64748호 근저당권자 이명원 2023년11월9일 근저당권자 김윤주 제203100호 민응호 민응호 출력일시: 2025년 8월 7일 오전 9시2분57초 1/2 `;

// UPDATED Pattern E: removed \d{4}년 from negative lookahead to allow capturing inline transfers
const patternE = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s*)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^\d]*?채권최고액\s+금\s*([\d,\s]+)원\s*(?:제\d+호\s*)*근저당권자\s+((?:(?!대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

const match = patternE.exec(actualOCR);
if (match) {
  console.log('Full match:', match[0]);
  console.log('\nCaptured creditor field:', `"${match[6]}"`);
  console.log('Creditor length:', match[6].length);

  // Test inline transfer detection
  const cleanCreditor = match[6].trim();
  const inlineTransferMatch = cleanCreditor.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*근저당권자\s+(.+)$/);
  if (inlineTransferMatch) {
    const originalCreditor = cleanCreditor.split(/\d{4}년/)[0].trim();
    const transferredCreditor = inlineTransferMatch[1].trim().replace(/제\d+호/g, '').replace(/\s+/g, ' ').trim();
    console.log('\n✅ Inline transfer detected!');
    console.log(`   Original: "${originalCreditor}"`);
    console.log(`   Transferred to: "${transferredCreditor}"`);
  } else {
    console.log('\n❌ No inline transfer detected');
  }
} else {
  console.log('No match found');
}
