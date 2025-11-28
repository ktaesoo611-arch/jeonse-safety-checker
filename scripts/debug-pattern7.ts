/**
 * Debug Pattern 7 to see why it's not matching
 */

const text = `8 전세권변경 25 근저당권설정 2022년2월9일 제18787호 2022년1월27일 | 전세금 금3,200,000,000원 제14713호 채권최고액 금1,534,000,000원 근저당권자 유한회사 우리이지론대부 강규식 등`;

console.log('Testing text:', text);
console.log('\n' + '='.repeat(80) + '\n');

// Test individual parts of the pattern
console.log('Part 1: Can we find "25 근저당권설정"?');
const part1 = /\s(\d+)\s+근저당권설정/g;
let match = part1.exec(text);
if (match) {
  console.log(`  ✅ YES: Priority #${match[1]}`);
} else {
  console.log('  ❌ NO');
}

console.log('\nPart 2: Can we find the date after "근저당권설정"?');
const part2 = /\s(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g;
match = part2.exec(text);
if (match) {
  console.log(`  ✅ YES: ${match[2]}-${match[3]}-${match[4]}`);
  console.log(`  Full match: "${match[0]}"`);
} else {
  console.log('  ❌ NO');
}

console.log('\nPart 3: Can we find "채권최고액" after the date?');
const part3 = /\s(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액/gs;
match = part3.exec(text);
if (match) {
  console.log(`  ✅ YES`);
  console.log(`  Full match: "${match[0]}"`);
  console.log(`  Between date and 채권최고액: "${text.substring(text.indexOf(match[4] + '일') + 2, text.indexOf('채권최고액'))}"`);
} else {
  console.log('  ❌ NO');
  console.log('  The pattern [^금]*? is supposed to match any text that doesn\'t start with 금');
  console.log('  But there might be a 금 character in the jeonse amount that\'s blocking it');

  const dateEnd = text.indexOf('2022년2월9일') + '2022년2월9일'.length;
  const amountStart = text.indexOf('채권최고액');
  const between = text.substring(dateEnd, amountStart);
  console.log(`  Text between date and 채권최고액: "${between}"`);
  console.log(`  Contains 금? ${between.includes('금')}`);
}

console.log('\nPart 4: Try with a pattern that allows 금 in the middle:');
const part4 = /\s(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[\s\S]*?채권최고액/gs;
match = part4.exec(text);
if (match) {
  console.log(`  ✅ YES`);
  console.log(`  Full match: "${match[0]}"`);
} else {
  console.log('  ❌ NO');
}

console.log('\nPart 5: Full pattern with amount:');
const part5 = /\s(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[\s\S]*?채권최고액\s+금\s*([\d,\s]+)원/gs;
match = part5.exec(text);
if (match) {
  console.log(`  ✅ YES`);
  console.log(`  Priority: ${match[1]}`);
  console.log(`  Date: ${match[2]}-${match[3]}-${match[4]}`);
  console.log(`  Amount: ${match[5]}`);
} else {
  console.log('  ❌ NO');
}

console.log('\n' + '='.repeat(80));
console.log('\nCONCLUSION:');
console.log('The issue is [^금]*? which tries to match "anything except 금"');
console.log('But the jeonse data contains "전세금 금3,200,000,000원" which has 금');
console.log('So the pattern stops before reaching 채권최고액');
console.log('\nSOLUTION: Change [^금]*? to [\\s\\S]*? to allow ANY character');
