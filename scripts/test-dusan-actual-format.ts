/**
 * Test script with the ACTUAL format from the 두산아파트 OCR
 * Key difference: Owner name "진동성" appears BEFORE the date
 */

// This is the ACTUAL format from the logs
const sampleSummaryText = ` 순위번호 등기목적 접수정보 주요등기사항 대상소유자 8 근저당권설정 진동성 2018년3월29일 채권최고액 금240,000,000원 제54475호 근저당권자 주식회사국민은행 8-2 근저당권변경 진동성 2021년 10월19일 채권최고액 금209,700,000원 제170468호 8-3 근저당권이전 진동성 2022년11월22일 근저당권자 한국주택금융공사 제146245호 18 근저당권설정 진동성 2021년3월12일 채권최고액 금699,600,000원 제43903호 근저당권자 주식회사애큐온캐피탈 18-1 근저당권이전 진동성 2022년12월29일 근저당권자 한국자산관리공사 제168337호 26 근저당권설정 진동성 2021년10월26일 채권최고액 금300,000,000원 제174333호 근저당권자 성민투자금융대부주식회사 26-1 질권 진동성 2021년12월9일 채권액 금260,000,000원 제196618호 채권자 아프로파이낸셜대부주식회사 26-1-3 질권이전 진동성 2023년12월19일 채권자 오케이에프앤아이 대부주식회사 제179716호 26-3 질권 진동성 2023년4월7일 제45798호 채권액 금300,000,000원 채권자 황두원 출력일시 : 2025년 11월 4일 오후 3시55분16초 1/2 순위번호 등기목적 접수정보 주요등기사항 대상소유자 26-4 질권 진동성 2023년11월22일 채권액 금300,000,000원 제167290호 채권자 오케이에프앤아이 대부주식회사 28 전세권설정 진동성 2021년10월27일 전세금 금5,000,000원 제175052호 전세권자 성민투자금융대부주식회사 33 근저당권설정 진동성 20`;

console.log('Testing jeonse rights pattern with ACTUAL 두산아파트 format...\n');
console.log('Key: Owner name "진동성" appears BEFORE the date\n');

// OLD pattern (should FAIL)
const oldPattern = /(\d+)\s+전세권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?전세금\s+금\s*([\d,\s]+)원[^금]*?전세권자\s+((?:(?!대상소유자|\d+\s+근저당권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+\s+근저당권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

// NEW pattern (should SUCCEED)
const newPattern = /(\d+)\s+전세권설정\s+[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?전세금\s+금\s*([\d,\s]+)원[^금]*?전세권자\s+((?:(?!대상소유자|\d+\s+근저당권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+\s+근저당권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

console.log('=== Testing OLD pattern (should fail) ===\n');
let match;
let matchCount = 0;

while ((match = oldPattern.exec(sampleSummaryText)) !== null) {
  matchCount++;
  const [, priority, year, month, day, amount, tenant] = match;
  console.log(`Match ${matchCount}: Entry #${priority}`);
}

if (matchCount === 0) {
  console.log('❌ Old pattern found 0 matches (expected - this is the bug!)\n');
} else {
  console.log(`✅ Old pattern found ${matchCount} match(es)\n`);
}

console.log('=== Testing NEW pattern (should succeed) ===\n');
matchCount = 0;

while ((match = newPattern.exec(sampleSummaryText)) !== null) {
  matchCount++;
  const [, priority, year, month, day, amount, tenant] = match;
  const cleanAmount = parseInt(amount.replace(/,/g, '').replace(/\s+/g, ''));

  console.log(`✅ Match ${matchCount}:`);
  console.log(`  Entry #${priority}`);
  console.log(`  Date: ${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  console.log(`  Amount: ₩${cleanAmount.toLocaleString('ko-KR')}`);
  console.log(`  Tenant: "${tenant.trim()}"`);
  console.log('');
}

if (matchCount === 1) {
  console.log('✅ SUCCESS: New pattern correctly matched entry 28 with ₩5,000,000!');
  console.log('The fix handles owner names appearing before the date.');
} else {
  console.log(`❌ FAILURE: Expected 1 match, but found ${matchCount}`);
}
