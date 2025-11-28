/**
 * Test script with the EXACT format after cleanText() normalization
 * cleanText() does: text.replace(/\s+/g, ' ').trim()
 * This collapses all whitespace including newlines into single spaces
 */

// This is what the text looks like AFTER cleanText() processing
// All newlines and multiple spaces are collapsed to single spaces
const sampleSummaryText = `3. (근)저당권 및 전세권 등 ( 을구 ) 순위번호 등기목적 접수정보 주요등기사항 대상소유자 8 근저당권설정 2018년3월29일 채권최고액 금240,000,000원 진동성 제54475호 근저당권자 주식회사국민은행 8-2 근저당권변경 2021년10월19일 채권최고액 금209,700,000원 진동성 8-3 근저당권이전 2022년11월22일 근저당권자 한국주택금융공사 진동성 28 전세권설정 2021년10월27일 전세금 금5,000,000원 진동성 제175052호 전세권자 성민투자금융대부주식회사 33 근저당권설정 2022년1월6일 채권최고액 금7,500,000원 진동성 제1804호 근저당권자 황경분`;

console.log('Testing jeonse rights pattern with cleanText() format...\\n');

// The pattern from the code
const jeonsePattern = /(\d+)\s+전세권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?전세금\s+금\s*([\d,\s]+)원[^금]*?전세권자\s+((?:(?!대상소유자|\d+\s+근저당권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+\s+근저당권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

let match;
let matchCount = 0;

console.log('=== Searching for 전세권설정 ===\\n');

while ((match = jeonsePattern.exec(sampleSummaryText)) !== null) {
  matchCount++;
  const [fullMatch, priority, year, month, day, amount, tenant] = match;
  const cleanAmount = parseInt(amount.replace(/,/g, '').replace(/\s+/g, ''));

  console.log(`Match ${matchCount}:`);
  console.log(`  Entry #${priority}`);
  console.log(`  Date: ${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  console.log(`  Amount: ₩${cleanAmount.toLocaleString('ko-KR')}`);
  console.log(`  Tenant: "${tenant.trim()}"`);
  console.log(`  Full match length: ${fullMatch.length} chars`);
  console.log('');
}

console.log(`\\n✅ Total 전세권 found: ${matchCount}`);

if (matchCount === 1) {
  console.log('\\n✅ SUCCESS: Pattern correctly matched entry 28 with ₩5,000,000!');
} else {
  console.log(`\\n❌ FAILURE: Expected 1 match, but found ${matchCount}`);

  // Diagnostic
  if (sampleSummaryText.includes('전세권설정')) {
    console.log('\\n🔍 The text contains "전세권설정", but the pattern did not match.');

    // Show what's around 전세권설정
    const index = sampleSummaryText.indexOf('전세권설정');
    console.log('\\n--- Context around "전세권설정" (200 chars) ---');
    console.log(sampleSummaryText.substring(Math.max(0, index - 50), index + 150));
    console.log('\\n--- End context ---');
  }
}
