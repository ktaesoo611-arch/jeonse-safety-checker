/**
 * Test Pattern 7 against the ACTUAL malformed summary section from banpo-summary-section.txt
 */

import * as fs from 'fs';

// Read the actual malformed summary section
const summaryText = fs.readFileSync(
  'C:\\Projects\\jeonse-safety-checker\\scripts\\banpo-summary-section.txt',
  'utf-8'
);

console.log('=== Testing Pattern 7 on ACTUAL Malformed OCR ===\n');
console.log('Original text:\n', summaryText.substring(0, 500));
console.log('\n' + '='.repeat(80) + '\n');

// Normalize like the parser does
const cleanedText = summaryText.replace(/\s+/g, ' ').trim();
console.log('Cleaned text:\n', cleanedText);
console.log('\n' + '='.repeat(80) + '\n');

// Pattern 7 from deunggibu-parser.ts (FIXED: uses [\s\S]*? instead of [^금]*?)
const pattern7 = /(?:^|[\s\S]*?)\s(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[\s\S]*?채권최고액\s+금\s*([\d,\s]+)원[\s\S]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

let match;
const mortgages: any[] = [];

console.log('🔍 Running Pattern 7...\n');

while ((match = pattern7.exec(cleanedText)) !== null) {
  const [fullMatch, priorityStr, year, month, day, amountStr, creditorStr] = match;
  const priority = parseInt(priorityStr);
  const maxSecuredAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
  const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  console.log(`✅ Match found: #${priority}`);
  console.log(`   Date: ${registrationDate}`);
  console.log(`   Amount: ₩${maxSecuredAmount.toLocaleString('ko-KR')}`);
  console.log(`   Creditor raw: "${creditorStr}"`);
  console.log(`   Full match (first 200 chars): "${fullMatch.substring(0, 200)}..."`);
  console.log('');

  mortgages.push({
    priority,
    registrationDate,
    maxSecuredAmount,
    creditor: creditorStr.trim()
  });
}

console.log('\n=== Summary ===');
console.log(`Expected: Entry #25 (₩1,534,000,000, 2022-02-09)`);
console.log(`Found: ${mortgages.length} mortgage(s)`);
console.log(`Detected: ${mortgages.map(m => `#${m.priority}`).join(', ') || 'NONE'}`);

if (mortgages.some(m => m.priority === 25)) {
  const entry25 = mortgages.find(m => m.priority === 25);
  console.log('\n✅ SUCCESS: Pattern 7 detected entry #25');
  console.log(`   Amount: ₩${entry25?.maxSecuredAmount.toLocaleString('ko-KR')}`);
  console.log(`   Date: ${entry25?.registrationDate}`);
} else {
  console.log('\n❌ FAILED: Pattern 7 did NOT detect entry #25');
  console.log('\nDEBUG: Looking for "25 근저당권설정" in cleaned text:');
  const idx = cleanedText.indexOf('25 근저당권설정');
  if (idx >= 0) {
    console.log(`Found at index ${idx}`);
    console.log(`Context: "${cleanedText.substring(Math.max(0, idx - 50), idx + 150)}"`);
  } else {
    console.log('NOT FOUND');
  }
}
