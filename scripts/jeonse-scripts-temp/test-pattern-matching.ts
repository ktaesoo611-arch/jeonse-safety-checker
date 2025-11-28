/**
 * Test UPDATED pattern matching for 강남엘에이치1단지 format
 */

const summaryText = ` 순위번호 등기목적 접수정보 주요등기사항
25 근저당권설정 2016년10월4일 채권최고액 금504,000,000원
제204221호 근저당권자 송파농업협동조합 대상소유자 박진경

41 근저당권설정 2021년12월15일 채권최고액 금806,400,000원
제240238호 근저당권자 제이비우리캐피탈주식회사 박진경

43 근저당권설정 2022년5월23일 채권최고액 금118,800,000원
제75079호 근저당권자 제이비우리캐피탈주식회사`;

console.log('Testing UPDATED Pattern E (with receipt number skip):');
const patternE = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^\d]*?채권최고액\s+금\s*([\d,\s]+)원\s*(?:제\d+호\s*)*근저당권자\s+((?:(?!대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

let matchE;
let countE = 0;
while ((matchE = patternE.exec(summaryText)) !== null) {
  countE++;
  const [fullMatch, priority, year, month, day, amount, creditor] = matchE;
  console.log(`  Match ${countE}: #${priority} (${year}-${month}-${day})`);
  console.log(`    Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`    Creditor: "${creditor.trim()}"`);
}
console.log(`\n✅ Total matches: ${countE}`);
console.log(`Expected: 3 mortgages (#25, #41, #43)`);
