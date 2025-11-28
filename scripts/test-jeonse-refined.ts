/**
 * Test refined jeonse change pattern to match the correct date
 */

const text = `8 전세권변경 25 근저당권설정 2022년2월9일 제18787호 2022년1월27일 | 전세금 금3,200,000,000원`;

console.log('Testing text:', text);
console.log('\n' + '='.repeat(80) + '\n');

// Original pattern (matches first date)
console.log('Original Pattern (matches first date after 변경):');
const pattern1 = /(\d+)(?:-\d+)?\s+전세권변경[\s\S]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[\s\S]*?전세금\s+금\s*([\d,\s]+)원/gs;
let match = pattern1.exec(text);
if (match) {
  console.log(`  Priority: ${match[1]}`);
  console.log(`  Date: ${match[2]}-${match[3]}-${match[4]}`);
  console.log(`  Amount: ${match[5]}`);
  console.log(`  ❌ WRONG: This is the mortgage date (2022-02-09), not jeonse date`);
} else {
  console.log('  NO MATCH');
}

console.log('\n' + '='.repeat(80) + '\n');

// Refined pattern: Find date CLOSEST to 전세금 by looking backwards from 전세금
console.log('Refined Pattern (find date closest to 전세금):');
const pattern2 = /(\d+)(?:-\d+)?\s+전세권변경[\s\S]*?전세금\s+금\s*([\d,\s]+)원/gs;
match = pattern2.exec(text);
if (match) {
  const [fullMatch, priority, amount] = match;
  console.log(`  Priority: ${priority}`);
  console.log(`  Amount: ${amount}`);

  // Now extract the LAST date before 전세금 in the full match
  const dateMatches = [...fullMatch.matchAll(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g)];
  if (dateMatches.length > 0) {
    const lastDate = dateMatches[dateMatches.length - 1];
    console.log(`  Found ${dateMatches.length} date(s) in match`);
    console.log(`  Last date (closest to 전세금): ${lastDate[1]}-${lastDate[2]}-${lastDate[3]}`);
    console.log(`  ✅ CORRECT: This is the jeonse date (2022-01-27)`);
  }
} else {
  console.log('  NO MATCH');
}

console.log('\n' + '='.repeat(80) + '\n');

// Alternative: More specific pattern that looks for date with | or 제 before it
console.log('Alternative Pattern (look for 제...호 YYYY년 or | YYYY년 before 전세금):');
const pattern3 = /(\d+)(?:-\d+)?\s+전세권변경[\s\S]*?(?:제\d+호|[\|])\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[\s\S]*?전세금\s+금\s*([\d,\s]+)원/gs;
match = pattern3.exec(text);
if (match) {
  console.log(`  Priority: ${match[1]}`);
  console.log(`  Date: ${match[2]}-${match[3]}-${match[4]}`);
  console.log(`  Amount: ${match[5]}`);
  console.log(`  ✅ CORRECT: This is the jeonse date (2022-01-27)`);
} else {
  console.log('  NO MATCH');
}

console.log('\n' + '='.repeat(80) + '\n');
console.log('RECOMMENDATION: Use Alternative Pattern with 제...호 or | prefix');
