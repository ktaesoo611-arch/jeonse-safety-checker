// Test script for Pattern I and Pattern E regex
// This tests if the patterns can match mortgage #16 from the 벽산 document

// ACTUAL OCR format from the 벽산 document (all on one line)
const actualOCR = `순위번호 등기목적 접수정보 주요등기사항

11 근저당권설정 2015년 6월3일 제48831호 채권최고액 근저당권자 금275,000,000원 주식회사우리은행 대상소유자 민응호

16 근저당권설정 2021년3월22일 채권최고액 금260,000,000원 제64748호 근저당권자 이명원

16-1 근저당권이전 2023년11월9일 근저당권자 김윤주 제203100호 민응호`;

// Test format (what I thought it was - multi-line)
const testFormat = `순위번호 등기목적 접수정보 주요등기사항
11 근저당권설정 2015년 6월3일 채권최고액 금275,000,000원
제48831호 근저당권자 주식회사우리은행 대상소유자 민응호

16 근저당권설정 2021년3월22일 채권최고액 금260,000,000원
제64748호 근저당권자 이명원

16-1 근저당권이전 2023년11월9일 근저당권자 김윤주
제203100호 민응호`;

const summaryText = actualOCR;

// Pattern I: Multi-line with 제XXX호 on second line (벽산 format)
const patternI = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+채권최고액\s+금\s*([\d,\s]+)원\s+제\d+호\s+근저당권자\s+((?:(?!대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

console.log('Testing against ACTUAL 벽산 OCR format...\n');
console.log('Summary text:');
console.log(summaryText);
console.log('\n' + '='.repeat(80) + '\n');

// Pattern E: Multi-line table format with (?:제\d+호\s*)* to skip receipt numbers
const patternE = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^\d]*?채권최고액\s+금\s*([\d,\s]+)원\s*(?:제\d+호\s*)*근저당권자\s+((?:(?!대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

console.log('Testing Pattern E (multi-line with receipt number skip)...');
let matchE;
let countE = 0;
while ((matchE = patternE.exec(summaryText)) !== null) {
  countE++;
  const [fullMatch, priority, year, month, day, amount, creditor] = matchE;
  console.log(`  Match #${countE}:`);
  console.log(`    Priority: ${priority}`);
  console.log(`    Date: ${year}년 ${month}월 ${day}일`);
  console.log(`    Amount: ₩${amount.replace(/,/g, '').replace(/\s+/g, '')}`);
  console.log(`    Creditor: "${creditor.trim()}"`);
  console.log();
}
console.log(`Pattern E: Found ${countE} match(es)\n`);

console.log('='.repeat(80) + '\n');
console.log('Testing Pattern I (multi-line with 제XXX호 on same line)...');
let matchI;
let matchCount = 0;
while ((matchI = patternI.exec(summaryText)) !== null) {
  matchCount++;
  const [fullMatch, priority, year, month, day, amount, creditor] = matchI;
  console.log(`  Match #${matchCount}:`);
  console.log(`    Full match: "${fullMatch}"`);
  console.log(`    Priority: ${priority}`);
  console.log(`    Date: ${year}년 ${month}월 ${day}일`);
  console.log(`    Amount: ${amount}`);
  console.log(`    Creditor: "${creditor}"`);
  console.log();
}
console.log(`Pattern I: Found ${matchCount} match(es)\n`);

if (countE === 0 && matchCount === 0) {
  console.log('❌ NO MATCHES FOUND');
  console.log('\nDebugging: Let\'s check what the pattern is looking for...\n');

  // Test simpler patterns step by step
  const step1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g;
  console.log('Step 1: Check if we can match the date part...');
  const dateMatches = summaryText.match(step1);
  console.log('Date matches:', dateMatches);
  console.log();

  const step2 = /채권최고액\s+금\s*([\d,\s]+)원/g;
  console.log('Step 2: Check if we can match the amount part...');
  const amountMatches = summaryText.match(step2);
  console.log('Amount matches:', amountMatches);
  console.log();

  const step3 = /제\d+호\s+근저당권자/g;
  console.log('Step 3: Check if we can match the creditor keyword part...');
  const keywordMatches = summaryText.match(step3);
  console.log('Keyword matches:', keywordMatches);
  console.log();

  // Now try the full pattern but with simpler ending
  const simplifiedPattern = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+채권최고액\s+금\s*([\d,\s]+)원\s+제\d+호\s+근저당권자\s+(.+?)$/gm;
  console.log('Step 4: Try with multiline mode and simpler ending...');
  let simplifiedMatch;
  let simplifiedCount = 0;
  while ((simplifiedMatch = simplifiedPattern.exec(summaryText)) !== null) {
    simplifiedCount++;
    console.log(`Simplified match #${simplifiedCount}:`, simplifiedMatch[0]);
  }

  if (simplifiedCount === 0) {
    console.log('Still no matches with simplified pattern');
    console.log('\nLet\'s check the exact text around mortgage #16:');
    const lines = summaryText.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('16 근저당권설정') || line.includes('제64748호')) {
        console.log(`Line ${i}: "${line}"`);
        console.log(`  Char codes:`, Array.from(line).map(c => c.charCodeAt(0)).join(' '));
      }
    });
  }
} else {
  console.log(`✅ Found ${matchCount} match(es)`);
}
