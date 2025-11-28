/**
 * Test the new jeonse change pattern against the actual malformed OCR
 */

import * as fs from 'fs';

// Read the actual malformed summary section
const summaryText = fs.readFileSync(
  'C:\\Projects\\jeonse-safety-checker\\scripts\\banpo-summary-section.txt',
  'utf-8'
);

console.log('=== Testing Jeonse Change Pattern on ACTUAL Malformed OCR ===\n');

// Normalize like the parser does
const cleanedText = summaryText.replace(/\s+/g, ' ').trim();
console.log('Cleaned text:\n', cleanedText);
console.log('\n' + '='.repeat(80) + '\n');

// New jeonse change pattern (SIMPLE: look for YYYY년MM월DD일 | 전세금 pattern)
// Require | after date to match the standard format, use short distance (80 chars) to get FIRST date
const jeonseChangePattern = /(\d+)(?:-\d+)?\s+전세권변경[\s\S]{1,80}?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*[\|]\s*전세금\s+금\s*([\d,\s]+)원/gs;

let match;
const jeonseChanges: any[] = [];

console.log('🔍 Running Jeonse Change Pattern...\n');

let matchCount = 0;
while ((match = jeonseChangePattern.exec(cleanedText)) !== null) {
  matchCount++;
  const [fullMatch, priority, year, month, day, amount] = match;
  const priorityNum = parseInt(priority);
  const cleanAmount = parseInt(amount.replace(/,/g, '').replace(/\s+/g, ''));
  const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  console.log(`✅ Match #${matchCount}: Priority #${priority}`);
  console.log(`   Date: ${registrationDate}`);
  console.log(`   Amount: ₩${cleanAmount.toLocaleString('ko-KR')}`);
  console.log(`   Match starts at: "${fullMatch.substring(0, 50)}..."`);
  console.log(`   Full match length: ${fullMatch.length} chars`);
  console.log('');

  jeonseChanges.push({
    priority: priorityNum,
    registrationDate,
    amount: cleanAmount
  });
}

console.log('\n=== Summary ===');
console.log(`Expected: Entry #3-2 (₩1.9억) and #8 (₩3.2억)`);
console.log(`Found: ${jeonseChanges.length} jeonse change(s)`);
console.log(`Detected: ${jeonseChanges.map(j => `#${j.priority} (₩${(j.amount / 100000000).toFixed(1)}억)`).join(', ') || 'NONE'}`);

if (jeonseChanges.some(j => j.priority === 8)) {
  const entry8 = jeonseChanges.find(j => j.priority === 8);
  if (entry8 && entry8.amount === 3200000000) {
    console.log('\n✅ SUCCESS: Entry #8 with ₩3.2억 FOUND');
  } else {
    console.log(`\n❌ PARTIAL: Entry #8 found but wrong amount: ₩${entry8 ? (entry8.amount / 100000000).toFixed(1) : '?'}억`);
  }
} else {
  console.log('\n❌ FAILED: Entry #8 NOT detected');
}
