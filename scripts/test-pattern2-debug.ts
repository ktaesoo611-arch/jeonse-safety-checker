/**
 * Debug why Pattern 2 is matching "25" instead of "43"
 */

const text = `41 근저당권설정 박진경 2021년12월15일 채권최고액 금806,400,000원 제240238호 근저당권자 제이비우리캐피탈주식회사 43 25 근저당권설정 박진경 2022년5월23일 채권최고액 금118,800,000원 제75079호 근저당권자 제이비우리캐피탈주식회사`;

console.log('Text:', text);
console.log('');
console.log('Looking for pattern: (\\d+)\\s+근저당권설정');
console.log('');

// Test what the regex actually matches
const simplePattern = /(\d+)\s+근저당권설정/g;
let match;

while ((match = simplePattern.exec(text)) !== null) {
  console.log(`Match at position ${match.index}:`);
  console.log(`  Captured priority: "${match[1]}"`);
  console.log(`  Full match: "${match[0]}"`);
  console.log(`  Context: "${text.substring(Math.max(0, match.index - 20), match.index + 30)}"`);
  console.log('');
}

console.log('Problem: The pattern matches "25 근저당권설정" from within "43 25 근저당권설정"');
console.log('Solution: We need to ensure the priority number is at an entry boundary\n');

console.log('Testing with word boundary or lookahead:');
const boundaryPattern = /(?:^|출력일시|대상소유자|채무자|\d+\s+(?:전세권|임차권|질권|근저당권이전|근저당권변경|근저당권말소)).*?(\d+)\s+근저당권설정/g;

while ((match = boundaryPattern.exec(text)) !== null) {
  console.log(`Match at position ${match.index}:`);
  console.log(`  Captured priority: "${match[1]}"`);
  console.log(`  Full match: "${match[0]}"`);
  console.log('');
}

console.log('\nBetter approach: Match the ENTIRE entry including any leading numbers');
console.log('Pattern: (\\d+)(?:\\s+\\d+)*\\s+근저당권설정\n');

const betterPattern = /(\d+)(?:\s+\d+)*\s+근저당권설정/g;

while ((match = betterPattern.exec(text)) !== null) {
  console.log(`Match at position ${match.index}:`);
  console.log(`  Captured priority: "${match[1]}"`);
  console.log(`  Full match: "${match[0]}"`);
  console.log(`  Context: "${text.substring(Math.max(0, match.index - 10), match.index + 40)}"`);
  console.log('');
}

console.log('This captures "43" from "43 25 근저당권설정" and includes "(?:\\s+\\d+)*" to skip the extra "25"');
