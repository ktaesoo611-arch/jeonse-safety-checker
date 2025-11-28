// Test why mortgage #10-1 transfer pattern doesn't match

const summaryText = `10 근저당권설정 2023년5월30일 채권최고액 제76144호 근저당권자 금19,500,000원 김선회 주식회사현대부동산연구소
10-1 근저당권이전 2023년 12월 14일 근저당권자 제186638호 주식회사아라에이엠씨대부 김선회
11 임차권설정 2023년6월7일 제80667호 임차보증금 금13,000,000원 임차권자 권미리 김선회`;

// FIXED transfer pattern - removed "제\d+호" from negative lookahead
const transferPattern = /(\d+)-\d+\s+(?:\d+번)?근저당권이전\s+\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|[\s\n]+\d+-\d+\s+근저당권|[\s\n]+\d+-\d+\s+질권|[\s\n]+\d+\s+근저당권|[\s\n]+\d+\s+질권|[\s\n]+\d+\s+전세권|[\s\n]+\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|[\s\n]+\d+-\d+\s+근저당권|[\s\n]+\d+-\d+\s+질권|[\s\n]+\d+\s+근저당권|[\s\n]+\d+\s+질권|[\s\n]+\d+\s+전세권|[\s\n]+\d+\s+임차권|출력일시|$)/gs;

console.log('Testing why 10-1 transfer doesn\'t match...\n');
console.log('Text to match:');
console.log(summaryText);
console.log('\n' + '='.repeat(80) + '\n');

// Test the pattern
const match = transferPattern.exec(summaryText);

if (match) {
  console.log('✅ Pattern matched!');
  console.log(`  Full match: "${match[0]}"`);
  console.log(`  Priority: ${match[1]}`);
  console.log(`  Creditor: "${match[2]}"`);
} else {
  console.log('❌ Pattern did NOT match');
  console.log('\nDebugging step by step...\n');

  // Step 1: Match the basic structure
  const step1 = /10-1\s+근저당권이전/;
  console.log(`Step 1 - Match "10-1 근저당권이전": ${step1.test(summaryText) ? '✅' : '❌'}`);

  // Step 2: Add date
  const step2 = /10-1\s+근저당권이전\s+2023년\s*12월\s*14일/;
  console.log(`Step 2 - Match with date (with spaces): ${step2.test(summaryText) ? '✅' : '❌'}`);

  // Step 3: Add everything until 근저당권자
  const step3 = /10-1\s+근저당권이전\s+2023년\s*12월\s*14일[^근]*?근저당권자/;
  console.log(`Step 3 - Match up to "근저당권자": ${step3.test(summaryText) ? '✅' : '❌'}`);

  // Step 4: Try to capture creditor
  const step4 = /10-1\s+근저당권이전\s+2023년\s*12월\s*14일[^근]*?근저당권자\s+(.+?)(?=\s+김선회)/;
  const step4Match = step4.exec(summaryText);
  console.log(`Step 4 - Capture creditor (stop at owner name): ${step4Match ? '✅ "' + step4Match[1] + '"' : '❌'}`);

  // Check what comes after "근저당권자"
  const afterMatch = summaryText.match(/근저당권자\s+(.{0,50})/);
  console.log(`\nWhat comes after "근저당권자": "${afterMatch ? afterMatch[1] : 'NOT FOUND'}"`);

  // Check if "제\d+호" is causing issues
  console.log(`\nDoes the negative lookahead "(?!제\\d+호)" prevent matching "제186638호"?`);
  console.log(`  Text after 근저당권자: "제186638호 주식회사아라에이엠씨대부"`);
  console.log(`  The negative lookahead in the pattern says "don't match if you see 제\\d+호"`);
  console.log(`  But we WANT to match "제186638호 주식회사아라에이엠씨대부" and then clean "제186638호" later!`);
}

console.log('\n' + '='.repeat(80));
console.log('\nCONCLUSION:');
console.log('The issue might be that the negative lookahead (?!제\\d+호) is preventing');
console.log('the pattern from matching when "제186638호" appears right after "근저당권자".');
console.log('\nThe pattern should allow matching "제186638호" in the creditor capture,');
console.log('then remove it during cleaning with .replace(/제\\d+호/g, \'\')');
